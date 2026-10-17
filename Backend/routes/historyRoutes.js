const express = require('express');
const router = express.Router();
const {
  getHistory,
  saveHistory,
  deleteHistoryItem,
  clearHistory,
} = require('../controllers/historyController');
const { protect } = require('../middleware/authMiddleware');

// All history routes require user authentication
router.use(protect);

router.get('/', getHistory);
router.post('/', saveHistory);
router.delete('/:videoId', deleteHistoryItem);
router.delete('/', clearHistory);

module.exports = router;
