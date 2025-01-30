import { serve } from "./api";
import { createDb } from "./db/db";

createDb()
serve()
