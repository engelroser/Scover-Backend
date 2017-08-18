import resource from 'resource-router-middleware';
import moment from 'moment';
import parseformat from 'moment-parseformat';
import {resolveUploadSrc} from '../lib/upload';
import saveImg from '../lib/img';
import GooglePlaces from 'node-googleplaces';
import {addLocationsUrl, addLocationsUserData, addLocationCounters, replacePhotos} from './locations';
import pushNotification from '../lib/pushNotification';

export const DATE_FORMAT = 'YYYY-MM-DD';

export function holidaysSearch({ config, db}) {
	const Holiday = db.models['holiday'];
	const Sponsor = db.models['sponsor'];
	const Category = db.models['category'];

	const queryMap = {
		include:[
			{ model: Category, attributes: ['id','activeUrl', 'inactiveUrl'], through: {attributes:[]} },
			{ model: Sponsor, attributes: ['id', 'logoUrl'], through: {attributes:[]} }
		],
		attributes: ['id','name', 'date', 'background','banner', 'description', 'url'],
		order: 'date'
	};
	return ({query:{search}}, res) => {
		if (search) {
			let m = moment(search)
			let conds = m.isValid() ? [{ date: { $eq: m.format(DATE_FORMAT) }	} ] : []

			Holiday.findAll({
				where: {
					$or: [...conds,
						{	description: { $iLike: `%${search}%`	}	},
						{	name: { $iLike: `%${search}%`	}	}
					]
				},
				...queryMap
			})
			.then( arr => {
				res.json(arr);
			})
		} else {
			res.sendStatus(200);
		}
	}
}

export function holidaysLocations ({ config, db }) {
	const Holiday = db.models['holiday'];
	const Category = db.models['category'];

	const places = new GooglePlaces(config.googleAPIKey);

	const params = ({location, keyword, radius, search}) => {
		const p = {location, keyword};
		if (radius) {
			p.radius = radius;
		} else {
			p.rankby = 'distance';
		}
		if (search) { p.keyword += '+'+search; }
		return p;
	}

  return (req, res) => {
    let id = parseInt(req.params.id);
    let category = parseInt(req.query.category);
		let location = req.query.location;
		let radius = req.query.radius;
		let pagetoken = req.query.pagetoken;
		let rankby = 'distance';
		let search = req.query.search;

		if (pagetoken) {
			places.nearbySearch({pagetoken})
			.then( ({body}) => addLocationCounters(body, db) )
			.then( body => addLocationsUserData(body, req.user, db))
			.then( addLocationsUrl )
			.then( replacePhotos )
			.then((body) => {
				res.json(body);
			});
		} else
    if (id) {
      Holiday.findById(id)
      .then( h => h.getCategories()).then(categories => {

				category = category ? categories.find(v => v.id == category) : null;
				if (category) {
					const keyword = category.holidayCategories.keyword;
					places.nearbySearch(params({location, radius, keyword, search}))
					.then( ({body}) => addLocationCounters(body, db) )
					.then( body => addLocationsUserData(body, req.user, db))
					.then( addLocationsUrl )
					.then( replacePhotos )
					.then((body) => {
						res.json(body);
					});
				} else {
					let p = [];
					for (let c of categories) {
						const keyword = c.holidayCategories.keyword;
						p.push(
							places.nearbySearch(params({location, radius, keyword, search}))
							.then(({body}) =>
								addLocationCounters(body, db)
								.then( body => addLocationsUserData(body, req.user, db))
								.then( addLocationsUrl )
								.then( replacePhotos )
							)
						);
					}
					Promise.all(p)
					.then(resArray=> {
						let r = {};
						for (let i in resArray) {
							r[categories[i].name] = resArray[i];
						}
						res.json(r);
					})
				}

			})
    }
  }
}
export function holidaysUpdate ({ config, db }) {
	const Holidays = db.models['holiday'];

	return ({body}, res) => {
		let p = [];
		for (let h of body) {
			const {recommended, priority, priorityRecommended} = h;
			p.push(
				Holidays.findById(h.id)
				.then(holiday => holiday.update({recommended, priority, priorityRecommended}) )
			)
		}
		Promise.all(p).then((h)=>{res.json(h)});
	}
}
export function holidaysWeeks ({ config, db }) {
	const Holidays = db.models['holiday'];

	let weeksDates = [];
	let m = moment.utc().startOf('d').week(1).isoWeekday(1);

	let n = m.weeksInYear();
	let d1,d2;
	for (let i =0; i<n; i++) {
		const start = m.clone();
		m.add(7, 'd');
		const end = m.clone().subtract(1,'s');
		weeksDates.push( {start, end} );
	}
	const datesArray = weeksDates.map((m=>'(varchar \''+m.start.format(DATE_FORMAT) +'\' , varchar \''+m.end.format(DATE_FORMAT)+'\')'));

	return (req, res) => {
		let id = parseInt(req.params.id)
		if (id >= 0 && id < n ) {
			const date1 = weeksDates[id].start.format(DATE_FORMAT);
			const date2 = weeksDates[id].end.format(DATE_FORMAT);
			Holidays.findAll({
				where: {
					date: { $between: [date1, date2] }
				},
				attributes: ['id','name', 'date', 'recommended', 'priority', 'priorityRecommended'],
				order: ['date', 'priority']
			})
			.then(week => res.json({week}));
		} else {
			db.query(`
				SELECT d1, d2, COUNT(holidays.id) FROM holidays RIGHT OUTER JOIN
				unnest(array[${datesArray}]) dd(d1 text, d2 text)
				ON holidays.date BETWEEN date(d1) AND date(d2) GROUP BY d1, d2 ORDER BY date(d1);`,
				{ type: db.QueryTypes.SELECT }
			).then(function(weeks) {
				res.json({ weeks });
			})
		}
	}
}

export function holidaysMonths ({ config, db }) {
	let monthsDates = [];
	let m = moment.utc().startOf('year');
	for (let i = 0; i< 12; i++) {
		const start = m.clone();
		const end = m.clone().endOf('month');
		monthsDates.push( {start, end} );
		m.add(1, 'M');
	}
	const datesArray = monthsDates.map((m=>'(varchar \''+m.start.format(DATE_FORMAT) +'\' , varchar \''+m.end.format(DATE_FORMAT)+'\')'));

	return (req, res) => {
		db.query(`
			SELECT d1, d2, COUNT(holidays.id) FROM holidays,
 			unnest(array[${datesArray}]) dd(d1 text, d2 text)
			WHERE holidays.date BETWEEN date(d1) AND date(d2) GROUP BY d1, d2;`,
		  { type: db.QueryTypes.SELECT }
		).then(function(months) {
		  res.json({ months });
		})
	}
}

export default ({ config, db }) => {

	const Holidays = db.models['holiday'];
	const Category = db.models['category'];
	const Sponsor = db.models['sponsor'];
	const HomeSection = db.models['homeSection'];
	const Bookmark = db.models['bookmark'];

	const queryMap = {
		include:[
			{ model: Category, attributes: ['id','activeUrl', 'inactiveUrl', 'name'], through: {attributes:[]} },
			{ model: Sponsor, attributes: ['id', 'logoUrl', 'name'], through: {attributes:[]} }
		],
		attributes: ['id','name', 'date', 'background','banner', 'description', 'url'],
		order: ['date', 'priority']
	};

	const todayHolidays = (res) => {
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

		Promise.all([
			Holidays.findAll({
				where: {date: todayDate},
				...queryMap
			}),
			Holidays.findAll({
				where: {
					date: { $between: [upDate1, upDate2] }
				},
				...queryMap
			}),
			Holidays.findAll({
				where: {
					date: { $between: [rDate1, rDate2] },
					recommended: true
				},
				...queryMap
			}),
			HomeSection.findAll({
				attributes: ['id', 'title', 'description', 'background','backgroundUrl'],
				order: 'id',
				include:[
					{ model: Sponsor, attributes: ['id', 'logoUrl', 'name'], through: {attributes:[]} }
				],
			})
		])
		.then( ([ today, upcoming, recommended, ui ]) => {
			let [uiToday, uiRecommended, uiUpcoming] = ui;
			uiToday = {...uiToday.toJSON(), amount: today.length};
			uiRecommended = {...uiRecommended.toJSON(), amount: recommended.length};
			uiUpcoming = {...uiUpcoming.toJSON(), amount: upcoming.length};

			res.json({today, upcoming, recommended, uiToday, uiRecommended, uiUpcoming});
		})
	}

	return resource({

		/** Property name to store preloaded entity on `request`. */
		id : 'holiday',

		/** For requests with an `id`, you can auto-load the entity.
		 *  Errors terminate the request, success sets `req[id] = data`.
		 */
		load(req, id, callback) {
			Holidays.findById( id, {
				include:[
					{ model: Category, attributes: ['id'] },
				 	{ model: Sponsor, attributes: ['id'] }
				]
			} )
			.then( (h)=> {
				let err = h ? null : 'Not found';
				callback(err, h);
			})
		},

		/** GET / - List all entities */
		index( {params, query, user} , res) {

			let includeTotal = false;
			if ('today' in query) {
				return todayHolidays(res);
			}
			let queryDbParams = {order: 'date ASC'};
			if (query._sort) {
				queryDbParams.order = ((query._sort != 'date_f') ? query._sort: 'date')
					+' '+ (query._order || 'ASC');
			}
			if (query._start && query._end) {
				queryDbParams.offset = query._start;
				queryDbParams.limit = query._end - query._start;
			}
			if (query.limit) {
				queryDbParams.offset = query.offset ? query.offset : 0;
				queryDbParams.limit = query.limit;
				includeTotal = true;
			}

			let m1, m2;
			let where = {};
			let modifiedQMap = {...queryMap};
			if ('passed' in query) {
				queryDbParams.order = [['date','DESC'], ['id', 'DESC']];
				m1 = moment().startOf('year');
				m2 = moment().subtract(1, 'day');
				modifiedQMap.include = [
					...modifiedQMap.include,
					{
            model: Bookmark,
            required:true,
            where: {
              locationId: {$eq: null},
              userId: user.id
            },
            attributes: ['id']
					}
				];
				modifiedQMap.distinct = true;
			} else
			if (query.month) {
				let m = moment(query.month);
				if (m.isValid()) {
					m1 = m.clone();
					m2 = m.endOf('month');
				}
			} else if (query.week) {
				let m = moment(query.week);
				if (m.isValid()) {
					m1 = m.clone();
					m2 = m.endOf('isoWeek');
				}
			} else if (query.date1 && query.date2) {
			 	let d1 = moment(query.date1);
				let d2 = moment(query.date2);
			 	if (d1.isValid() && d2.isValid()) {
			 		m1 = d1;
					m2 = d2;
				}
			}
			if (m1 && m2) {
				where.date = {
					$between: [
						m1.format(DATE_FORMAT),
						m2.format(DATE_FORMAT)
				]};
			}
			if (query.q) {
				const search = query.q;
				let m = moment(search, parseformat(search));
		    let conds = m.isValid() ? [{ date: { $eq: m.format(DATE_FORMAT) }	} ] : [];
		    where = {...where,
		      $or: [...conds,
		        {	description: { $iLike: `%${search}%`	}	},
		        {	name: { $iLike: `%${search}%`	}	}
		      ],
		    }
			}


			Holidays.findAndCount({
				...modifiedQMap,
				...queryDbParams,
				where
			})
			.then( ( {count: total, rows: holidays} ) => {
				if (includeTotal) {
					res.json({holidays, total})
				} else {
					res.setHeader("X-Total-Count", total);
					res.json(holidays);
				}
			})

		},

		/** POST / - Create a new entity */
		create({ body }, res) {
			let holiday = {
				name: body.name,
				date: body.date,
				description: body.description,
			}
			Promise.all([
				saveImg(body.background),
				saveImg(body.banner),
			])
			.then( ([background, banner])=>
				Holidays.create({...holiday, background, banner})
			)
			.then( h=> {
				h.categoriesKeywords = [body.categoriesIds, body.keywords];
				h.setSponsors(body.sponsorsIds);
				return h;
			})
			.then((h)=>{res.json(h)});
		},

		/** GET /:id - Return a given entity */
		read({ holiday }, res) {
			res.json(resolveUploadSrc(holiday.toJSON(), ['background', 'banner']));
		},

		/** PUT /:id - Update a given entity */
		update({ holiday, body }, res) {
			let attributes = {
				name: body.name,
				date: body.date,
				description: body.description,

				sponsorsIds: body.sponsorsIds,
			}
			Promise.all([
				saveImg(body.background),
				saveImg(body.banner),
			])
			.then( ([background, banner])=>
				holiday.update({...attributes, background, banner})
			)
			.then( h => {
				h.categoriesKeywords = [body.categoriesIds, body.keywords];
				return h;
			} )
			.then((h)=>{res.json(h)});
		},

		/** DELETE /:id - Delete a given entity */
		delete({ holiday }, res) {
			holiday.destroy()
			.then( ()=> res.json(holiday) );
		}
	})

};

export function postAlarm({config, db}) {
	const Holiday = db.models['holiday'];
	const Alarm = db.models['alarm'];

	return ({headers, user, params:{id}}, res) => {
		let holiday;
		Holiday.findById( id )
		.then(h => {
			holiday = h;
			return (h && user.id) ?
				Alarm.findOrCreate( {where:{userId: user.id, holidayId: h.id}} )
				: Promise.reject()
			}
		)
		.then(([alarm])=> {
			const now = moment()
			let triggerAt = moment.utc(holiday.date).subtract(2, 'days');
			if (now.isAfter(triggerAt)) {
				triggerAt.add(1, 'days')
			}
			if (now.isAfter(triggerAt)) {
				triggerAt.add(1, 'days')
			}
			if (now.isAfter(triggerAt)) {
				return alarm.destroy();
			}
			return alarm.update({triggerAt})
		})
		.then(a=> {
			pushNotification(a);
			res.json(a)
		})
		.catch((e)=>res.sendStatus(400));
	}
}
