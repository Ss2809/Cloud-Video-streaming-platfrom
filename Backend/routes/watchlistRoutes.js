const express = require('express');
const router = express.Router();
const {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  checkWatchlistStatus,
  clearWatchlist,
} = require('../controllers/watchlistController');
const { protect } = require('../middleware/authMiddleware');

// All watchlist routes require user authentication
router.use(protect);

router.get('/', getWatchlist);
router.post('/:videoId', addToWatchlist);
router.delete('/:videoId', removeFromWatchlist);
router.get('/check/:videoId', checkWatchlistStatus);
router.delete('/', clearWatchlist);

module.exports = router;
