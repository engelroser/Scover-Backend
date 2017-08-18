import resource from 'resource-router-middleware';
import {resolveUploadSrc} from '../lib/upload';
import saveImg from '../lib/img';

export default ({ config, db }) => {

  const Sponsor = db.models['sponsor'];
  const SponsorLike = db.models['sponsorLike'];
  const SponsorLink = db.models['sponsorLink'];
  const SponsorMedia = db.models['sponsorMedia'];

  return resource({

    /** Property name to store preloaded entity on `request`. */
    id : 'sponsor',

    /** For requests with an `id`, you can auto-load the entity.
    *  Errors terminate the request, success sets `req[id] = data`.
    */
    load(req, id, callback) {
      Sponsor.findById( id ).then( (c)=> {
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
        Sponsor.count(),
        Sponsor.findAll({
          attributes: [
            'id',
            'name',
            'logo'
          ],
          ...queryDbParams
        })])
        .then( ( [count, sponsors] ) => {
          res.setHeader("X-Total-Count", count);
          res.json(sponsors);
        })
      },

      /** POST / - Create a new entity */
      create({ body }, res) {
        let sponsor = {
          name: body.name,
          description: body.description,
          sponsorLinks: body.links,
          sponsorMedia: body.mediaObjs
        }
        saveImg(body.logo)
        .then(logo =>
          Sponsor.create({...sponsor, logo}, {include: [SponsorLink, SponsorMedia]})
        )
        .then((c)=>{res.json(c)});
      },

      /** GET /:id - Return a given entity */
      read({ sponsor, user }, res) {
        const where = {sponsorId: sponsor.id}
        Promise.all([
          SponsorLike.findOne({where:{...where,
            userId: user.id,
          }}),
          SponsorLink.findAll({where}),
          SponsorMedia.findAll({where}),
        ])
        .then(([like, links, mediaObjs])=>{
          let s = resolveUploadSrc(sponsor.toJSON(), ['logo']);
          if (like) {
            s.like = true;
          }
          links = links.map( ({name, url}) => ({name, url}) );
          const media = mediaObjs.map( ({url}) => url);

          res.json({...s, links, media, mediaObjs});
        })
      },

      /** PUT /:id - Update a given entity */
      update({ sponsor, body, body:{name, description} }, res) {

        saveImg(body.logo, sponsor.logo)
        .then( logo =>
          sponsor.update({name, description, logo})
        )
        .then( s => {
          SponsorLink.bulkCreate(body.links, {fields:['name','url'], returning: true})
          .then( links => s.setSponsorLinks(links) )
          SponsorMedia.bulkCreate(body.mediaObjs, {fields:['url'], returning: true})
          .then( media => s.setSponsorMedia(media) )

          return s;
        })
        .then((s)=>{res.json(s)});
      },

      /** DELETE /:id - Delete a given entity */
      delete({ sponsor }, res) {
        sponsor.destroy()
        .then( ()=> res.json(sponsor) );
      }
    })

  };

export function sponsorLike({ config, db }) {
  const Sponsor = db.models['sponsor'];
  const SponsorLike = db.models['sponsorLike'];

  return ({params:{sponsorId}, user}, res) => {
    SponsorLike.findOrCreate({where:{sponsorId, userId:user.id}})
    .then( ()=>res.sendStatus(200) )
    .catch( ()=> res.sendStatus(400) )
  }

}
export function sponsorUnlike({ config, db }) {
  const Sponsor = db.models['sponsor'];
  const SponsorLike = db.models['sponsorLike'];

  return ({params:{sponsorId}, user}, res) => {
    SponsorLike.findOne({where:{sponsorId, userId:user.id}})
    .then( like => like.destroy() )
    .then( () =>res.sendStatus(200) )
    .catch( (e)=> {console.log(e);res.sendStatus(400)} )
  }

}
