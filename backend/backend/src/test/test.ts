import { backofficeApi } from "../db/helpers/frontend-api";

(async () => {
  console.log(await backofficeApi.getEvents("amb", "eth", undefined, undefined));
})()
