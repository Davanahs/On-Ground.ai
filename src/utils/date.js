// Local (not UTC) YYYY-MM-DD. toISOString() is UTC and gives yesterday's date before 5:30 AM in IST.
export const localDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
