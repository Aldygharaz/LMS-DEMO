import { handle } from 'hono/vercel';
import app from './boot';

export default handle(app);
