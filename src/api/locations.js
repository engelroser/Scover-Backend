import GooglePlaces from 'node-googleplaces';
import cfg from '../config.json';

const photoRefToUrl = p =>
  p.photo_reference ? cfg.googleAPIPhotoUrl+p.photo_reference : null;

export const replacePhotosRefInLocation = function(l) {
  if (l.photos && Array.isArray(l.photos)) {
    const photos = l.photos.map(photoRefToUrl);
    return {...l, photos}
  } else {
    return l;
  }
}

export function locationLike ({ config, db }) {
  const Location = db.models['location'];
  const User = db.models['user'];

  return ( { method, user, params:{like, placeId} }, res) => {

    if (user.id && placeId) {
      Promise.all([
        User.findById(user.id),
        Location.findOrCreate({where:{placeId}})
      ])
      .then( ( [u, [loc]] )=>{
        if (method == 'POST') {
          loc.locationLike = {liked:like=='like'};
          u.addLocation(loc);
        } else if (method == 'DELETE') {
          u.removeLocation(loc);
        }
      })
      .then(()=>
        res.sendStatus(200)
      )
      .catch(()=>
        res.sendStatus(400)
      )
    } else {
      res.sendStatus(403)
    }
  }
}

export function locationInfo ({ config, db }) {
  const Location = db.models['location'];
  const LocationLike = db.models['locationLike'];
  const User = db.models['user'];
  const Checkin = db.models['checkin'];
  const Bookmark = db.models['bookmark'];

  const places = new GooglePlaces(config.googleAPIKey);

  return ( { user, params:{placeId} }, res) => {

    Promise.all([
      places.details({placeid:placeId}),
      Location.findOne({where:{placeId}})
        .then(loc =>
          Promise.all([
            loc && user.id ? // user like
            LocationLike.findOne( {where:{
              locationId: loc.id,
              userId: user.id
            }} )
            : null,
            loc && user.id ? // user bookmark
            Bookmark.findOne ( {where:{
              locationId: loc.id,
              userId: user.id
            }} ) : null,
            // overall counters
            loc ? LocationLike.count({where:{
              liked: true,
              locationId: loc.id
            }}) : 0,
            loc ? LocationLike.count({where:{
              liked: false,
              locationId: loc.id
            }}) : 0,
            loc ? Checkin.count({where:{
              locationId: loc.id
            }}) : 0,
            loc ? Bookmark.count({where:{
              locationId: loc.id
            }}) : 0
          ]) )
    ])
    .then( ([loc, [like, bookmark, likes, dislikes, checkins, bookmarks]]) => {
      if (loc.body) {
        const bookmarkId = bookmark ? bookmark.id : null;
        const result = {...loc.body.result, likes, dislikes, checkins, bookmarks, bookmarkId};
        if (like) {
          if (like.liked) result.like = true; else result.dislike = true;
        }
        return {...loc.body, result};
      }
    })
    .then( r => ( {...r, result:replacePhotosRefInLocation(r.result)} ) )
    .then(r => res.json(r))
    .catch(e=>res.sendStatus(400));
  }
}

export function addLocationCounters(locations, db) {
  const LocationLike = db.models['locationLike'];
  const Location = db.models['location'];
  const Checkin = db.models['checkin'];
  const Bookmark = db.models['bookmark'];

  const fillLikes = function (l) {

    return Location.findOne({where:{placeId: l.place_id}})
    .then(loc =>
      loc ?
      Promise.all([
        LocationLike.count({where:{
          liked: true,
          locationId: loc.id
        }}),
        LocationLike.count({where:{
          liked: false,
          locationId: loc.id
        }}),
        Checkin.count({where:{
          locationId: loc.id
        }}),
        Bookmark.count({where:{
          locationId: loc.id
        }})
      ])
      : [0,0,0,0]
    )
    .then(  ( [likes, dislikes, checkins, bookmarks] )  =>
      ( {...l, likes, dislikes, checkins, bookmarks} )
    )

  }

  return Promise.all(locations.results.map(fillLikes))
    .then(results => ({...locations, results}) )

}

export function addLocationsUserData(locations, user, db) {
  const LocationLike = db.models['locationLike'];
  const Location = db.models['location'];
  const Bookmark = db.models['bookmark'];

  const addData = function(l) {
    return Location.findOne({where:{placeId: l.place_id}})
    .then(loc =>
      loc && user.id ?
      Promise.all([
        LocationLike.findOne( {where:{
          locationId: loc.id,
          userId: user.id
        }} ),
        Bookmark.findOne( {where:{
          locationId: loc.id,
          userId: user.id
        }} )
      ])
      : [null, null] )
    .then( ([like, bookmark]) => {
      const bookmarkId = bookmark ? bookmark.id : undefined;
      const newLoc = {...l, bookmarkId};
      if (like) {
        if (like.liked) newLoc.like = true; else newLoc.dislike = true;
      }
      return newLoc;
    } );
  }
  return Promise.all(locations.results.map(addData))
    .then(results => ({...locations, results}) )

}
export function addLocationsUrl(locations) {
  const results = locations.results.map(l=>({...l,
    url: 'https://www.google.com/maps/place/?q=place_id:'+l.place_id
  }));
  return {...locations, results};
}

export function replacePhotos(locations) {
  const results = Array.isArray(locations.results) ? locations.results.map(replacePhotosRefInLocation) : locations.results;
  return {...locations, results}
}

export function locationPhotos({config, db}) {
  const Photo = db.models['photo'];
  const Location = db.models['location'];

  return ( {  params:{placeId}, query:{limit,offset} }, res) => {
    Location.findOne({where:{placeId}})
    .then(loc =>
      loc ?
      Photo.findAndCount( {
        where:{ locationId : loc.id },
        attributes: [
          'id',
          'name',
          'imgUrl'
        ],
        limit, offset } )
      : {rows:[],count:0}
    )
    .then(({rows: photos, count: total}) => res.json({photos, total}));
  }
}

export function postCheckin({config, db}) {
  const Location = db.models['location'];
  const User = db.models['user'];
  const Checkin = db.models['checkin'];

  return ( { method, user, params:{placeId} }, res) => {

    if (user.id && placeId) {
      Promise.all([
        User.findById(user.id),
        Location.findOrCreate({where:{placeId}})
      ])
      .then( ( [u, [loc]] ) => (u && loc) ? Checkin.create({userId:u.id, locationId: loc.id}) : null )
      .then(()=>
        res.sendStatus(200)
      )
      .catch(()=>
        res.sendStatus(400)
      )
    } else {
      res.sendStatus(403)
    }
  }
}
