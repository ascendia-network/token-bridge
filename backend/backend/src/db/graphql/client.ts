import { gql, GraphQLClient } from "graphql-request";
import { ponderGraphQlUrl } from "../../configs/config";


export const client = new GraphQLClient(ponderGraphQlUrl);


const query_status = gql`
query MyQuery {
  _meta {
    status
  }
}`

export async function getStatus(): Promise<any> {
  return (await client.request(query_status) as any)._meta.status;
}
