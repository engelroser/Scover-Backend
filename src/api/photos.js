import resource from 'resource-router-middleware';
import saveUploadedBase64, {resolveUploadSrc} from '../lib/upload';

export default ({ config, db }) => {

  const Photo = db.models['photo'];
  const Location = db.models['location'];
  const User = db.models['user'];
  const LocationLike = db.models['locationLike'];

  const preparePhotos = photos =>
    Promise.all(
      photos.map(p=> {
        const photo = {...p.toJSON()};
        if (photo.location) {
          return LocationLike.count({where:{
            liked: true,
            locationId: photo.location.id
          }}).then(c=> ( {...photo, location: {...photo.location, likes:c}} ) );
        } else {
          return photo;
        }
      })
    )

  return resource({

    /** Property name to store preloaded entity on `request`. */
    id : 'photo',

    /** For requests with an `id`, you can auto-load the entity.
    *  Errors terminate the request, success sets `req[id] = data`.
    */
    load(req, id, callback) {
      Photo.findById( id ).then( (c)=> {
        let err = c ? null : 'Not found';
        callback(err, c);
      })
    },

    /** GET / - List all entities */
    index( {user, params, query} , res) {

      let queryDbParams = {};
      if (query._sort && query._order) {
        queryDbParams.order = query._sort+' '+ query._order;
      }
      if (query._start && query._end) {
        queryDbParams.offset = query._start;
        queryDbParams.limit = query._end - query._start;
      }
      User.findById(user.id)
      .then(u=>
        Photo.findAndCount({
          where: {userId: u.id},
          attributes: [
            'id',
            'name',
            'imgUrl'
          ],
          include:[
      			{ model: Location, attributes: ['id', 'name', 'vicinity'] }
      		],
          ...queryDbParams
          })
      )
      .then( ( {rows, count} ) => {
        preparePhotos(rows).then( photos => {
          res.setHeader("X-Total-Count", count);
          res.json(photos);
        })
      })
    },

      /** POST / - Create a new entity */
    create({ user, body, body:{name, placeId, imgBase64, location} }, res) {
      if (user.id) {
        Promise.all([
          User.findById(user.id),
          placeId ? Location.findOrCreate({where:{placeId}}) : [null]
        ])
        .then( ( [u, [loc]] )=>{
          let photo = {
            name,
            coordinates: location,
            userId: u.id,
            locationId: loc ? loc.id : null
          }
          return saveUploadedBase64(imgBase64)
            .then(img => ({...photo, img}));
        })
        .then( p=> Photo.create(p) )
        .then( p=> res.json(p) )
        .catch( ()=> res.sendStatus(400) )
      } else {
        res.sendStatus(403)
      }


    },

    /** GET /:id - Return a given entity */
    read({ photo }, res) {
      res.json(photo);
    },

    /** PUT /:id - Update a given entity */
    update({ photo, body:{name, imgBase64} }, res) {
      saveUploadedBase64(imgBase64)
      .then(img => ({name, img}))
      .then(attrs => photo.update(attrs))
      .then((h)=>{res.json(h)});
    },

    /** DELETE /:id - Delete a given entity */
    delete({user,  photo }, res) {
      if (user && user.id == photo.userId) {
        photo.destroy()
        .then( ()=> res.json(photo) );
      } else {
          res.sendStatus(403);
      }
    }
  })

};
