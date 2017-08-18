//import React from 'react';
import moment from 'moment';



const generateDates = () => {
  let monthsDates = [];
  let m = moment.utc().startOf('year');
  for (let i = 0; i< 12; i++) {
    const start = m.clone();
    const end = m.clone().endOf('month');
    monthsDates.push( {start, end} );
    m.add(1, 'M');
  }
  return monthsDates;
}

export const monthsDates = () => {
  if (! monthsDates.dates) {
    monthsDates.dates = generateDates();
  }
  return monthsDates.dates;
}
