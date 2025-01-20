import {Router} from 'express';
import {shortenUrl, redirectToLongUrl, validatePasswordAndRedirect} from '../controllers/url.controller.js';

const router = Router();

router.post('/shorten', shortenUrl);
router.get('/:shortCode', redirectToLongUrl);
router.post('/validate-password', validatePasswordAndRedirect);


export default router;