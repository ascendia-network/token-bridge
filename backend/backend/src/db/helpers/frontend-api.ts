import { getEvents } from "../graphql/getEvent";
import { getStatus } from "../graphql/client";

class BackofficeApi {
  async getEvents(networkFrom: string, networkTo: string, eventFrom?: number, eventTo?: number) {

    const commonOpts = {
      networkFrom,
      networkTo,
      eventId_gte: eventFrom,
      eventId_lte: eventTo,
      orderBy: "eventId",
      orderDirection: "desc"
    };
    const commonOptsReversed = {
      ...commonOpts,
      networkFrom: networkTo,
      networkTo: networkFrom,
    };

    const events = [
      ...await getEvents({ eventName: "Withdraw", ...commonOpts }),
      ...await getEvents({ eventName: "Transfer", ...commonOpts }),
      ...await getEvents({ eventName: "TransferSubmit", ...commonOptsReversed }),
      ...await getEvents({ eventName: "TransferFinish", ...commonOptsReversed }),
    ];


    const eventsById: {[eventId: number]: any} = {};

    for (const event of events) {
      const eventId = event.eventId;
      if (!eventsById[eventId])
        eventsById[eventId] = {
          withdraws: [],
          transfer: undefined,
          transferSubmit: undefined,
          transferFinish: undefined
        };

      // @ts-ignore
      if (event.eventName === "Withdraw") eventsById[eventId].withdraws.push(event);
      if (event.eventName === "Transfer") eventsById[eventId].transfer = event;
      if (event.eventName === "TransferSubmit") eventsById[eventId].transferSubmit = event;
      if (event.eventName === "TransferFinish") eventsById[eventId].transferFinish = event;
    }

    return eventsById;

  }

}


class TxHistoryApi {
  async getWithdraws(userAddress: string) {
    const withdraws = await getEvents({eventName: "Withdraw", userTo: userAddress })

    const result = [];
    for (const withdraw of withdraws) {
      const transferFinish = await getEvents({
        eventName: "TransferFinish",
        eventId: withdraw.eventId,
        networkFrom: withdraw.networkTo,
        networkTo: withdraw.networkFrom
      });
      result.push({
        ...withdraw,
        transferFinish: transferFinish[0]
      });
    }
    return result;
  }
}


class TxStatusApi {
  async getWithdrawEvent(txHash: string) {
    const withdraw = await getEvents({ eventName: "Withdraw", txHash });
    return withdraw[0];
  }

  async getEvent(eventName: string, networkFrom: string, networkTo: string, eventId: number) {
    const withdraw = await getEvents({ eventName, networkFrom, networkTo, eventId });
    return withdraw[0];
  }

  async getLastBlock(network: string) {
    const status = await getStatus();
    return status[network]?.block.number;
  }
}

export const backofficeApi = new BackofficeApi();
export const txHistoryApi = new TxHistoryApi();
export const txStatusApi = new TxStatusApi();
