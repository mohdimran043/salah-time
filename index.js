const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');
const cors = require('cors');

const firestore = new Firestore();
const corsHandler = cors({ origin: true });

// Main API endpoint
functions.http('api', async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { date, location, month, year } = req.query;
      const path = req.path || '/';
      
      if (req.method === 'GET' && (path === '/prayer-times' || path === '/')) {
        const prayerTimes = await getPrayerTimes(date, location);
        res.json({
          success: true,
          data: prayerTimes,
          timezone: 'Asia/Qatar'
        });
      } else if (req.method === 'GET' && path === '/month') {
        const monthlyTimes = await getMonthlyPrayerTimes(month, year, location);
        res.json({
          success: true,
          data: monthlyTimes,
          timezone: 'Asia/Qatar'
        });
      } else if (req.method === 'GET' && path === '/next') {
        const nextPrayer = await getNextPrayer(location);
        res.json({
          success: true,
          data: nextPrayer,
          timezone: 'Asia/Qatar'
        });
      } else if (req.method === 'GET' && path === '/health') {
        res.json({ 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        });
      } else {
        res.status(404).json({ error: 'Endpoint not found' });
      }
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  });
});

async function getPrayerTimes(date, location = 'doha') {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  try {
    const doc = await firestore
      .collection('prayer-times')
      .doc(`${location}-${targetDate}`)
      .get();
    
    if (doc.exists) {
      return doc.data();
    }
    
    // Fallback to latest available data
    const latestDoc = await firestore
      .collection('prayer-times')
      .where('location', '==', location)
      .orderBy('date', 'desc')
      .limit(1)
      .get();
    
    if (!latestDoc.empty) {
      return latestDoc.docs[0].data();
    }
    
    throw new Error('No prayer times data available');
  } catch (error) {
    console.error('Firestore Error:', error);
    throw error;
  }
}

async function getMonthlyPrayerTimes(month, year, location = 'doha') {
  const currentDate = new Date();
  const targetMonth = month || (currentDate.getMonth() + 1);
  const targetYear = year || currentDate.getFullYear();
  
  const startDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`;
  const endDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-31`;
  
  try {
    const snapshot = await firestore
      .collection('prayer-times')
      .where('location', '==', location)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .get();
    
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Monthly fetch error:', error);
    throw error;
  }
}

async function getNextPrayer(location = 'doha') {
  const now = new Date();
  const qatarTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Qatar"}));
  const currentDate = qatarTime.toISOString().split('T')[0];
  const currentTime = qatarTime.toTimeString().split(' ')[0].substring(0, 5);
  
  try {
    const doc = await firestore
      .collection('prayer-times')
      .doc(`${location}-${currentDate}`)
      .get();
    
    if (!doc.exists) {
      throw new Error('No prayer times for today');
    }
    
    const todayTimes = doc.data().times;
    const prayers = [
      { name: 'Fajr', time: todayTimes.fajr },
      { name: 'Sunrise', time: todayTimes.sunrise },
      { name: 'Dhuhr', time: todayTimes.dhuhr },
      { name: 'Asr', time: todayTimes.asr },
      { name: 'Maghrib', time: todayTimes.maghrib },
      { name: 'Isha', time: todayTimes.isha }
    ];
    
    // Find next prayer
    for (const prayer of prayers) {
      if (prayer.time > currentTime) {
        return {
          nextPrayer: prayer.name,
          time: prayer.time,
          currentTime: currentTime,
          date: currentDate
        };
      }
    }
    
    // If no prayer left today, get tomorrow's Fajr
    const tomorrow = new Date(qatarTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    
    const tomorrowDoc = await firestore
      .collection('prayer-times')
      .doc(`${location}-${tomorrowDate}`)
      .get();
    
    if (tomorrowDoc.exists) {
      return {
        nextPrayer: 'Fajr',
        time: tomorrowDoc.data().times.fajr,
        currentTime: currentTime,
        date: tomorrowDate
      };
    }
    
    throw new Error('No upcoming prayer times available');
  } catch (error) {
    console.error('Next prayer error:', error);
    throw error;
  }
}

module.exports = { getPrayerTimes, getMonthlyPrayerTimes, getNextPrayer };