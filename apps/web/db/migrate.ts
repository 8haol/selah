import 'dotenv/config'
import { getDb } from './client'
process.env.SELAH_AUTO_MIGRATE = '1'
getDb().then(() => { console.log('migrated'); process.exit(0) }).catch((e) => { console.error(e); process.exit(1) })
