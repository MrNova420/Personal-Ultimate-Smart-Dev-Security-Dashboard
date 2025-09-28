import { Router } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

router.get('/metrics', asyncHandler(async (req, res) => {
  res.status(501).json({
    error: 'Monitoring metrics not yet implemented',
    message: 'This endpoint will be implemented in Phase 1, Week 3',
  });
}));

router.get('/health', asyncHandler(async (req, res) => {
  res.status(501).json({
    error: 'Health monitoring not yet implemented',
    message: 'This endpoint will be implemented in Phase 1, Week 3',
  });
}));

export default router;