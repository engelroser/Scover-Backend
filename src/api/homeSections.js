import resource from 'resource-router-middleware';
import moment from 'moment';
import {resolveUploadSrc} from '../lib/upload';
import saveImg from '../lib/img';
import {DATE_FORMAT} from './holidays';

export default ({ config, db }) => {

  const HomeSection = db.models['homeSection'];
	const Holiday = db.models['holiday'];
	const Sponsor = db.models['sponsor'];

	const countHolidays = () => {
		let m = moment()
		const todayDate = m.format(DATE_FORMAT);

		let endWeek = m.clone().startOf('isoWeek').add(6, 'd'); // sql `between` is including endpoints
		if (m.isSame(endWeek, 'day')) {
			endWeek.add(1, 'week');
		}
		m.add(1, 'd');
		const upDate1 = m.format(DATE_FORMAT);
		const upDate2 = endWeek.format(DATE_FORMAT);

		const rDate1 = todayDate;
		const rDate2 = upDate2;

		return Promise.all([
			Holiday.count({
				where: {date: todayDate},
			}),
			Holiday.count({
				where: {
					date: { $between: [rDate1, rDate2] },
					recommended: true
				}
			}),
      Holiday.count({
				where: {
					date: { $between: [upDate1, upDate2] }
				}
			})
		])
	}

	return resource({

		/** Property name to store preloaded entity on `request`. */
		id : 'section',

		/** For requests with an `id`, you can auto-load the entity.
		 *  Errors terminate the request, success sets `req[id] = data`.
		 */
		load(req, id, callback) {
			HomeSection.findById( id, {
				include:[
				 	{ model: Sponsor, attributes: ['id'] }
				]
			} )
			.then( (h)=> {
				let err = h ? null : 'Not found';
				callback(err, h);
			})
		},

		/** GET / - List all entities */
		index( req, res) {

			Promise.all([
        HomeSection.findAll({
          attributes: ['id', 'title', 'description', 'background','backgroundUrl'],
          order: 'id',
          include:[
      			{ model: Sponsor, attributes: ['id', 'logoUrl', 'name'], through: {attributes:[]} }
      		],
        }),
				countHolidays()
      ])
			.then( ( [sections, counters] ) => {
        res.setHeader("X-Total-Count", sections.length);
        res.json(
          sections.map( (s,i) => ({...s.toJSON(), amount: counters[i]}) )
        )
			})

		},


		/** GET /:id - Return a given entity */
		read({ section }, res) {
			res.json(resolveUploadSrc(section.toJSON(), ['background']));
		},

		/** PUT /:id - Update a given entity */
		update({ section, body }, res) {
			let attributes = {
				title: body.title,
				description: body.description,
			}
      saveImg(body.background, section.background)
      .then( background => section.update({...attributes, background}))
			.then( s => {
        s.setSponsors(body.sponsorsIds)
				return s;
			} )
			.then((s)=>{res.json(s)});
		},

	})

};
