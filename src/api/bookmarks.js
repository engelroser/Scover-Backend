import resource from 'resource-router-middleware';
import parseformat from 'moment-parseformat';
import moment from 'moment';
import {DATE_FORMAT} from './holidays';
import {replacePhotosRefInLocation} from './locations';

export function bookmarksSearch({ config, db }) {
  const Bookmark = db.models['bookmark'];
  const Holiday = db.models['holiday'];
  const Location = db.models['location'];
  const LocationLike = db.models['locationLike'];
  const User = db.models['user'];
  const Category = db.models['category'];
  const Sponsor = db.models['sponsor'];

  const holidayQueryMap = {
		include:[
			{ model: Category, attributes: ['id','activeUrl', 'inactiveUrl'], through: {attributes:[]} },
			{ model: Sponsor, attributes: ['id', 'logoUrl'], through: {attributes:[]} }
		],
		attributes: ['id','name', 'date', 'background','banner', 'description', 'url'],
		order: 'date'
	};
  const holidaysSearchMap = search => {
    let m = moment(search, parseformat(search));
    let conds = m.isValid() ? [{ date: { $eq: m.format(DATE_FORMAT) }	} ] : [];
    return {
      $or: [...conds,
        {	description: { $iLike: `%${search}%`	}	},
        {	name: { $iLike: `%${search}%`	}	}
      ],
    }
  }
  const prepareHolidays = ({rows, count}) => {
    const holidays = rows.map(h=> {
      const bookmarkId = h.bookmarks.length ? h.bookmarks[0].id : null;
      return {...h.toJSON(), bookmarkId, bookmarks: undefined};
    })
    return [holidays, count];
  }
  const locationsSearchMap = search => (
    { $or: [
      {	vicinity: { $iLike: `%${search}%`	}	},
      {	name: { $iLike: `%${search}%`	}	},
    ]}
  )
  const prepareLocations = ({rows, count, user}) => {
    const locations = rows.map(l => {
      l.json = {result: replacePhotosRefInLocation(l.json.result)};
      const {name, vicinity, place_id, geometry, icon} = l.json.result;
      const bookmarkId = l.bookmarks.length ? l.bookmarks[0].id : null;
      const url = 'https://www.google.com/maps/place/?q=place_id:'+place_id;
      return Location.findOne({where:{placeId: l.placeId}})
        .then( loc =>
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
            LocationLike.findOne({where:{
              locationId: loc.id,
              userId: user.id
            }}) ]) : [0,0, null] )
        .then(([likes, dislikes, like]) => {
          const loc = {
            id: l.id,
            vicinity,
            name,
            likes,
            dislikes,
            place_id,
            geometry,
            icon,
            bookmarkId,
            url
          }
          if (like) {
            return like.liked ? {...loc, like: true} : {...loc, dislike: true};
          }
          else return loc;
        });

    })
    return Promise.all( [ Promise.all(locations), count] )
  }

  return ({user, params:{entity}, query:{search,limit,offset}}, res) => {

    if (entity == 'holidays') {
      let conds = search ? holidaysSearchMap(search) :null;

      Holiday.findAndCount({
				where: {
					...conds,
				},
        distinct: true,
        limit, offset,
				...holidayQueryMap,
        include: [{
            model: Bookmark,
            required:true,
            where: {
              locationId: {$eq: null},
              userId: user.id
            },
            attributes: ['id']
        }, ...holidayQueryMap.include],
			})
      .then(prepareHolidays)
      .then(([holidays, total]) => res.json({holidays, total}));
    } else if (entity == 'locations') {
      let conds = search ? locationsSearchMap(search) :null;

      Location.findAndCount({
        where: {
          ...conds,
        },
        include: [{
            model: Bookmark,
            required:true,
            where: {
              userId: user.id },
            attributes: ['id']
        }],
        limit, offset,
        distinct: true,
      })
      .then(({rows, count})=> prepareLocations({rows, count, user}))
      .then(([locations, total]) => res.json({locations, total}));
    } else {
      res.sendStatus(404);
    }
  }

}

export default ({ config, db }) => {
  const Bookmark = db.models['bookmark'];
  const Holiday = db.models['holiday'];
  const Location = db.models['location'];
  const User = db.models['user'];

  return resource({

    /** Property name to store preloaded entity on `request`. */
    id : 'bookmark',

    /** For requests with an `id`, you can auto-load the entity.
    *  Errors terminate the request, success sets `req[id] = data`.
    */
    load(req, id, callback) {
      Bookmark.findById( id ).then( (c)=> {
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
        Promise.all([
          Bookmark.count(),
          Bookmark.findAll({
            where: {userId: u.id},
            include: [Location, Holiday],
            ...queryDbParams
            })
        ]) )
        .then( ( [count, bookmarks] ) => {
          res.setHeader("X-Total-Count", count);
          res.json(bookmarks);
        })
      },

      /** POST / - Create a new entity */
      create({ user, body, body:{placeId, holiday} }, res) {
        if (user.id) {
          Promise.all([
            User.findById(user.id),
            placeId ? Location.findOrCreate({where:{placeId}}) : [null],
            Holiday.findById(holiday)
          ])
          .then( ( [u, [loc], h] )=> {
            if (!u || !(loc || h)) return Promise.reject();
            let bookmark = {
              userId: u.id,
              locationId: loc ? loc.id : null,
              holidayId: h ? h.id : null
            }
            return Bookmark.findOrCreate({where:bookmark})
          })
          .then( ([p])=> res.json(p) )
          .catch( (e)=> {
            console.log(e);
            res.sendStatus(400);
          } );
        } else {
          res.sendStatus(403)
        }


      },

      /** GET /:id - Return a given entity */
      read({ bookmark }, res) {
        res.json(bookmark);
      },

      /** PUT /:id - Update a given entity */
      update({ bookmark, body }, res) {
        let attributes = {
        }
        bookmark.update(attributes).then((h)=>{res.json(h)});
      },

      /** DELETE /:id - Delete a given entity */
      delete({user,  bookmark }, res) {
        if (user && user.id == bookmark.userId) {
          bookmark.destroy()
          .then( ()=> res.json(bookmark) );
        } else {
            res.sendStatus(403);
        }
      }
    })

  };
