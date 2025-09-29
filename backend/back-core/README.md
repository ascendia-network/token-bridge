```
npm install
npm run dev
```

```
open http://localhost:3000
```

## To create table and materialized view (when its not exists or else) run the sql file into DB console
[File](./drizzle/0000_little_stone_men.sql)
```shell
psql [ARGS] -f ./drizzle/0000_little_stone_men.sql
```
or copy and paste the exact query from file to `psql` cli
