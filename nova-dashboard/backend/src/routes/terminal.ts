import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/sessions', asyncHandler(async (req, res) => {
  res.status(501).json({
    error: 'Terminal sessions not yet implemented',
    message: 'This endpoint will be implemented in Phase 4, Week 14',
  });
}));

router.post('/sessions', asyncHandler(async (req, res) => {
  res.status(501).json({
    error: 'Terminal session creation not yet implemented',
    message: 'This endpoint will be implemented in Phase 4, Week 14',
  });
}));

export default router;