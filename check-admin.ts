import 'dotenv/config'
import { Pool } from 'pg'

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  try {
    await pool.query('select 1')
    const res = await pool.query('SELECT id, full_name, email, role, status FROM public.users WHERE email = $1', ['admin@motaed.cd'])
    console.log('row count:', res.rowCount)
    for (const row of res.rows) {
      console.log(row)
    }
    if (res.rowCount === 0) {
      const res2 = await pool.query('SELECT id, full_name, email, role, status FROM public.users LIMIT 10')
      console.log('all users:', JSON.stringify(res2.rows, null, 2))
    }
  } catch (e) {
    console.error('DB ERROR:', (e as Error).message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}
void main()
