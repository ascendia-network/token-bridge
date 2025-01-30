import Database from 'better-sqlite3';

// Initialize SQLite database
const db = new Database('transactions.db');

export function createDb() {
return db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
        txSig TEXT PRIMARY KEY,
        userFrom TEXT NOT NULL,
        userTo TEXT NOT NULL,
        token TEXT NOT NULL,
        amount TEXT NOT NULL,
        feeAmount TEXT NOT NULL,
        additionalData TEXT,
        nonce TEXT NOT NULL,
        blockNum INTEGER NOT NULL,
        blockTime INTEGER NOT NULL
    );
`);
}
// Function to insert a transaction
export function saveTransaction(
  txSig: string,
  userFrom: string,
  userTo: string,
  token: string,
  amount: string,
  feeAmount: string,
  additionalData: string | null,
  nonce: string,
  blockNum: number,
  blockTime: number,
) {
  const stmt = db.prepare(`
        INSERT INTO transactions (txSig, userFrom, userTo, token, amount, feeAmount, additionalData, nonce, blockNum, blockTime)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  stmt.run(txSig, userFrom, userTo, token, amount, feeAmount, additionalData, nonce, blockNum, blockTime);
}

// Function to query transactions by user
export function getTransactionsByUser(user: string) {
  const stmt = db.prepare(`
        SELECT * FROM transactions
        WHERE userFrom = ? OR userTo = ?
        ORDER BY timestamp DESC
    `);
  return stmt.all(user, user);
}

// Function to query transactions by user
export function getTransactionsByBlockRange(startBlock: number, endBlock: number) {
  const stmt = db.prepare(`
        SELECT * FROM transactions
        WHERE blockNum >= ? AND blockNum <= ?
        ORDER BY timestamp DESC
    `);
  return stmt.all(startBlock, endBlock);
}
