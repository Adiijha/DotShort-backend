import {Router} from 'express';
import {
    shortenUrl, 
    redirectToLongUrl, 
    validatePasswordAndRedirect, 
    getUserLinks,
    deleteUrl
} from '../controllers/url.controller.js';
import { verifyJWT, optionalVerifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/shorten', optionalVerifyJWT, shortenUrl);
router.get('/user-links', verifyJWT, getUserLinks);
router.get('/:shortCode', redirectToLongUrl);
router.post('/validate-password', validatePasswordAndRedirect);
router.delete('/delete/:shortCode', verifyJWT, deleteUrl);



export default router;