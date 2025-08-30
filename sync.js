const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');
const { Storage } = require('@google-cloud/storage');
const axios = require('axios');
const moment = require('moment-timezone');

const firestore = new Firestore();
const storage = new Storage();
const BUCKET_NAME = 'waqf-qatar-data';

// Data sync function - scrapes Ministry of Awqaf
functions.http('sync', async (req, res) => {
  try {
    console.log('Starting prayer times sync...');
    
    const prayerData = await fetchPrayerTimesData();
    await storePrayerTimes(prayerData);
    await backupToStorage(prayerData);
    
    res.json({
      success: true,
      message: 'Prayer times synced successfully',
      recordsProcessed: prayerData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync Error:', error);
    res.status(500).json({ 
      error: 'Sync failed', 
      details: error.message 
    });
  }
});

async function fetchPrayerTimesData() {
  // Qatar coordinates: Doha
  const QATAR_LAT = 25.2854;
  const QATAR_LNG = 51.5310;
  const TIMEZONE = 'Asia/Qatar';
  
  // Using Aladhan API - reliable Islamic prayer times service
  const BASE_URL = 'http://api.aladhan.com/v1/calendar';
  
  try {
    const currentDate = moment().tz(TIMEZONE);
    const year = currentDate.year();
    const month = currentDate.month() + 1; // moment months are 0-indexed
    
    // Fetch current month + next month to ensure we have upcoming data
    const months = [month, month === 12 ? 1 : month + 1];
    const years = [year, month === 12 ? year + 1 : year];
    
    const allPrayerTimes = [];
    
    for (let i = 0; i < months.length; i++) {
      const response = await axios.get(BASE_URL, {
        params: {
          latitude: QATAR_LAT,
          longitude: QATAR_LNG,
          method: 2, // ISNA method - widely accepted
          month: months[i],
          year: years[i],
          tune: '0,0,0,0,0,0,0,0,0' // No adjustments - pure calculation
        },
        timeout: 10000
      });
      
      if (response.data.code === 200) {
        const monthData = response.data.data;
        
        monthData.forEach(day => {
          const timings = day.timings;
          const date = day.date.gregorian;
          
          allPrayerTimes.push({
            date: `${date.year}-${date.month.number.toString().padStart(2, '0')}-${date.day.padStart(2, '0')}`,
            location: 'doha',
            coordinates: {
              latitude: QATAR_LAT,
              longitude: QATAR_LNG
            },
            times: {
              fajr: timings.Fajr.split(' ')[0],
              sunrise: timings.Sunrise.split(' ')[0],
              dhuhr: timings.Dhuhr.split(' ')[0],
              asr: timings.Asr.split(' ')[0],
              maghrib: timings.Maghrib.split(' ')[0],
              isha: timings.Isha.split(' ')[0]
            },
            method: 'ISNA',
            source: 'Aladhan API - Islamic Prayer Times',
            hijriDate: {
              day: day.date.hijri.day,
              month: day.date.hijri.month.en,
              year: day.date.hijri.year
            },
            lastUpdated: new Date().toISOString()
          });
        });
      }
    }
    
    console.log(`Fetched ${allPrayerTimes.length} days of prayer times`);
    return allPrayerTimes;
    
  } catch (error) {
    console.error('API fetch failed:', error);
    throw new Error('Failed to fetch prayer times from Aladhan API');
  }
}

async function storePrayerTimes(prayerData) {
  const batch = firestore.batch();
  
  prayerData.forEach(prayer => {
    const docRef = firestore
      .collection('prayer-times')
      .doc(`${prayer.location}-${prayer.date}`);
    
    batch.set(docRef, prayer, { merge: true });
  });
  
  await batch.commit();
  console.log(`Stored ${prayerData.length} prayer time records`);
}

async function backupToStorage(prayerData) {
  const bucket = storage.bucket(BUCKET_NAME);
  const fileName = `backups/prayer-times-${new Date().toISOString().split('T')[0]}.json`;
  
  const file = bucket.file(fileName);
  await file.save(JSON.stringify(prayerData, null, 2), {
    metadata: {
      contentType: 'application/json'
    }
  });
  
  console.log(`Backup saved to ${fileName}`);
}

module.exports = { fetchPrayerTimesData, storePrayerTimes };