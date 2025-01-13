import {Router} from 'express';
import {shortenUrl, redirectToLongUrl} from '../controllers/url.controller.js';

const router = Router();

router.post('/shorten', shortenUrl);
router.get('/:shortCode', redirectToLongUrl);

export default router;