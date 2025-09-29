import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/projects', asyncHandler(async (req, res) => {
  res.status(501).json({
    error: 'Development projects not yet implemented',
    message: 'This endpoint will be implemented in Phase 4, Week 15',
  });
}));

router.get('/languages', asyncHandler(async (req, res) => {
  res.status(501).json({
    error: 'Language support not yet implemented',
    message: 'This endpoint will be implemented in Phase 4, Week 13',
  });
}));

export default router;