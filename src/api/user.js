import { replacePhotosRefInLocation } from './locations';
import saveUploadedBase64 from '../lib/upload';

export function checkins({config,db}) {
  const Location = db.models['location'];
  const LocationLike = db.models['locationLike'];
  const User = db.models['user'];
  const Checkin = db.models['checkin'];

  const prepareCheckins = checkins =>
    Promise.all(
      checkins.map(c=> {
        const checkin = {...c.toJSON()};
        if (checkin.location) {
          const json = checkin.location.json
          const photos = (json && json.result) ? replacePhotosRefInLocation(checkin.location.json.result).photos.slice(0,4) : [];
          return LocationLike.count({where:{
            liked: true,
            locationId: checkin.location.id
          }}).then(count=> ( {...checkin, location: {...checkin.location, photos, likes:count, json:undefined}} ) );
        } else {
          return checkin;
        }
      })
    )

  return ({user}, res) => {

    Checkin.findAll({
      where:{
        userId: user.id
      },
      order: [['createdAt', 'DESC']],
      include:[
        { model: Location, attributes: ['id', 'name', 'vicinity', 'json'] }
      ],
    })
    .then(prepareCheckins)
    .then(checkins=>
      res.json(checkins)
    )
  }
}

export function profile({config, db}) {
  const LocationLike = db.models['locationLike'];
  const User = db.models['user'];
  const Checkin = db.models['checkin'];
  const Photo = db.models['photo'];
  const Avatar = db.models['avatar'];

  return ({user}, res) => {
    const where = {
      userId: user.id
    };
    Promise.all([
      User.findById(user.id),
      Checkin.count({where}),
      Photo.count({where}),
      LocationLike.count({where: {...where,
        liked: true
      }}),
      Avatar.findOne({where})
    ])
    .then(([{firstName,lastName,email}, checkins, photos, likes, avatar])=> {
      res.json({firstName, lastName, email, checkins, photos, likes, avatar: avatar ? avatar.pictureUrl: undefined})
    })
  }
}

export function updateAvatar({config, db}) {
  const User = db.models['user'];
  const Avatar = db.models['avatar'];

  return ({ user, body:{imgBase64} }, res) => {
    if (user.id) {
      User.findById(user.id)
      .then( u =>
        Promise.all([
          Avatar.findOrCreate({where:{userId: u.id}}),
          saveUploadedBase64(imgBase64)
        ])
      )
      .then( ([[a], picture]) => a.update({picture}) )
      .then( a => res.json(a) )
      .catch( ()=> res.sendStatus(400) )
    } else {
      res.sendStatus(403)
    }
  }

}
