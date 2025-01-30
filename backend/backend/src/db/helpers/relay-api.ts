import { getEvents, getEventsCount } from "../graphql/getEvent";

class RelayApi {
  async getEvent(networkFrom: string, networkTo: string, eventName: string, eventId: number) {
    const withdraw = await getEvents({ eventName, networkFrom, networkTo, eventId });
    return withdraw[0]?.jsonLog;
  }

  async getEventsFee(networkFrom: string, networkTo: string, eventFrom: number, eventTo: number) {
    const withdrawsCount = await getEventsCount({
      networkFrom,
      networkTo,
      eventId_gte: eventFrom!,
      eventId_lte: eventTo!,
      eventName: "Withdraw"
    });

    const transfers = await getEvents({
      eventName: "Transfer",
      networkFrom,
      networkTo,
      eventId_gte: eventFrom,
      eventId_lte: eventTo
    });
    const transferSubmits = await getEvents({
      eventName: "TransferSubmit",
      networkFrom: networkTo,
      networkTo: networkFrom,
      eventId_gte: eventFrom,
      eventId_lte: eventTo
    });
    const transferFinishes = await getEvents({
      eventName: "TransferFinish",
      networkFrom: networkTo,
      networkTo: networkFrom,
      eventId_gte: eventFrom,
      eventId_lte: eventTo
    });

    return { withdrawsCount, transfers, transferSubmits, transferFinishes };
  }

  async lastEventId(networkFrom: string, networkTo: string): Promise<number | undefined> {
    const event = await getEvents({ networkFrom: networkTo, networkTo: networkFrom, eventName: "TransferFinish", orderBy: "eventId", orderDirection: "desc", limit: 1 });
    return event[0]?.eventId;
  }

}

export const relayApi = new RelayApi();
