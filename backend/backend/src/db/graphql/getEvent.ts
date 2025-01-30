import { gql } from "graphql-request";
import { client } from "./client";


const query_getEvents = gql`
query MyQuery(
  $orderDirection: String, $orderBy: String, $limit: Int = 1000, $after: String, 
  $eventName: String, $eventId: Int, $eventId_lte: Int, $eventId_gte: Int, $txHash: String, $networkTo: String, $networkFrom: String,
  $userTo: String
) {
  bridgeEvents(
    limit: $limit
    after: $after
    orderBy: $orderBy
    orderDirection: $orderDirection
    where: {eventId: $eventId, eventId_gte: $eventId_gte, eventId_lte: $eventId_lte, eventName: $eventName, networkTo: $networkTo, networkFrom: $networkFrom, txHash: $txHash, userTo: $userTo}
  ) {
    items {
      txHash
      timestamp
      networkTo
      networkFrom
      methodId
      logIndex
      jsonLog
      id
      gasUsed
      gasPrice
      eventName
      eventId
      blockNumber
      amount
      feeBridge
      feeTransfer
      tokenFrom
      tokenTo
      userFrom
      userTo
    }
    pageInfo {
      endCursor
      hasNextPage
      hasPreviousPage
      startCursor
    }
  }
}
`

export async function getEvents(filters: any) {
  const result = [];
  while (true) {
    const resp = await client.request(query_getEvents, filters) as any;
    result.push(...resp.bridgeEvents.items);
    if (!resp.bridgeEvents.pageInfo.hasNextPage)
      break;
    filters.after = resp.bridgeEvents.pageInfo.endCursor;
  }
  return result
}


const query_getEventsCount = gql`
query MyQuery($networkTo: String, $networkFrom: String, $eventName: String, $eventId_gte: Int, $eventId_lte: Int) {
  rawEvents(
    where: {eventName: $eventName, networkFrom: $networkFrom, networkTo: $networkTo, eventId_lte: $eventId_lte, eventId_gte: $eventId_gte}
  ) {
    totalCount
  }
}
`

// separate query for totalCount because is too slow to be included in the main query
export async function getEventsCount(filters: any): Promise<number> {
  return (await client.request(query_getEventsCount, filters) as any).rawEvents.totalCount;
}



