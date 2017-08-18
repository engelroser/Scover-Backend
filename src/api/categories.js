import resource from 'resource-router-middleware';
import moment from 'moment';
import {resolveUploadSrc} from '../lib/upload';
import saveImg from '../lib/img';

export default ({ config, db }) => {

  const Category = db.models['category'];

  return resource({

    /** Property name to store preloaded entity on `request`. */
    id : 'category',

    /** For requests with an `id`, you can auto-load the entity.
    *  Errors terminate the request, success sets `req[id] = data`.
    */
    load(req, id, callback) {
      Category.findById( id ).then( (c)=> {
        let err = c ? null : 'Not found';
        callback(err, c);
      })
    },

    /** GET / - List all entities */
    index( {params, query} , res) {

      let queryDbParams = {};
      if (query._sort && query._order) {
        queryDbParams.order = query._sort+' '+ query._order;
      }
      if (query._start && query._end) {
        queryDbParams.offset = query._start;
        queryDbParams.limit = query._end - query._start;
      }

      Promise.all([
        Category.count(),
        Category.findAll({
          attributes: [
            'id',
            'name',
            'picture',
            'inactive'
          ],
          ...queryDbParams
        })])
        .then( ( [count, categories] ) => {
          res.setHeader("X-Total-Count", count);
          res.json(categories);
        })
      },

      /** POST / - Create a new entity */
      create({ body:{name, picture, inactive} }, res) {

        Promise.all([
  				saveImg(picture),
  				saveImg(inactive),
  			])
  			.then( ([picture, inactive])=>
          Category.create({name, picture, inactive})
        ).then((c)=>{res.json(c)});
      },

      /** GET /:id - Return a given entity */
      read({ category }, res) {
        res.json(resolveUploadSrc(category.toJSON(), ['picture', 'inactive']));
      },

      /** PUT /:id - Update a given entity */
      update({ category, body:{name, picture, inactive} }, res) {

        Promise.all([
  				saveImg(picture),
  				saveImg(inactive),
  			])
  			.then( ([picture, inactive])=>
          category.update({name, picture, inactive})
        ).then((h)=>{res.json(h)});
      },

      /** DELETE /:id - Delete a given entity */
      delete({ category }, res) {
        category.destroy()
        .then( ()=> res.json(category) );
      }
    })

  };
