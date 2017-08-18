import schedule from 'node-schedule';
import apn from 'apn';
import moment from 'moment';

export default (alarm) => {
  const Holiday = alarm.sequelize.models['holiday'];
  const DeviceToken = alarm.sequelize.models['deviceToken'];
  Promise.all([
    Holiday.findById(alarm.holidayId),
    DeviceToken.findOne({where:{userId:alarm.userId}})
  ])
  .then(([holiday, deviceToken]) => {
    if (holiday && deviceToken) {
      let date = moment(holiday.date).format("dddd, MMMM Do");
      let alert = `'${holiday.name}' is on ${date}`;
      let token = deviceToken.token;
      let jobName = 'alarm-'+alarm.holidayId+'-'+alarm.userId;
      console.log({date:alarm.triggerAt,alert});
      let job = schedule.scheduledJobs[jobName];
      if (job) {
        job.cancel();
      }
      schedule.scheduleJob(jobName, alarm.triggerAt, function() {
        push({alert}, token)
      });
    }
  })
}

var options = {
  token: {
    key: "key/AuthKey_9BXK44ZQHZ.p8",
    keyId: "9BXK44ZQHZ",
    teamId: "UPPEC3N425"
  },
  production: false
};

var apnProvider = new apn.Provider(options);

function push({alert}, deviceToken) {
  var note = new apn.Notification();

  note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
  note.alert = alert;
  //note.payload = {'messageFrom': 'John Appleseed'};
  note.topic = "com.dynamicsinplay.scover";

  apnProvider.send(note, deviceToken).then( (result) => {
    if (result.failed && result.failed.length) {
      console.error(result.failed[0])
    }
  });
}
