import { Router } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

router.get('/alerts', asyncHandler(async (req, res) => {
  res.status(501).json({
    error: 'Security alerts not yet implemented',
    message: 'This endpoint will be implemented in Phase 3, Week 9',
  });
}));

router.get('/scans', asyncHandler(async (req, res) => {
  res.status(501).json({
    error: 'Security scans not yet implemented',
    message: 'This endpoint will be implemented in Phase 3, Week 10',
  });
}));

export default router;