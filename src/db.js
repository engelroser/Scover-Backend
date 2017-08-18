import Sequelize, {DataTypes} from 'sequelize';
import holidaysBootstrap from '../holidays.json';
import moment from 'moment';
import {DATE_FORMAT} from './api/holidays';
import GooglePlaces from 'node-googleplaces';
import cfg from './config.json';
import fs from 'fs';
import pushNotification from './lib/pushNotification';

const resolveImgUrl = img =>
	img ? '/static/'+img : null;

function initializeModels(db) {

	const User = db.define('user', {
		firstName:{type: Sequelize.STRING},
		lastName:{type: Sequelize.STRING},
		email:{type: Sequelize.STRING, unique: true},
		password:{type: Sequelize.STRING},
		fbId:{type: Sequelize.STRING, unique: true},
		gId:{type: Sequelize.STRING, unique: true},
	});

	const Avatar = db.define('avatar', {
		picture: Sequelize.STRING,
		pictureUrl: {
			type: new DataTypes.VIRTUAL(DataTypes.STRING, ['picture']),
			get: function() {
				return resolveImgUrl(this.getDataValue('picture'));
			}
		},
	});
	Avatar.belongsTo(User);
	User.hasOne(Avatar);

	const Category = db.define('category', {
		name: {type: Sequelize.STRING, unique: true},
		picture: Sequelize.STRING,
		inactive: Sequelize.STRING,
		activeUrl: {
			type: new DataTypes.VIRTUAL(DataTypes.STRING, ['picture']),
			get: function() {
				return resolveImgUrl(this.getDataValue('picture'));
			}
		},
		inactiveUrl: {
			type: new DataTypes.VIRTUAL(DataTypes.STRING, ['inactive']),
			get: function() {
				return resolveImgUrl(this.getDataValue('inactive'));
			}
	  },
	});

	const Sponsor = db.define('sponsor', {
		name: {type: Sequelize.STRING, unique: true},
		logo: Sequelize.STRING,
		logoUrl: {
			type: new DataTypes.VIRTUAL(DataTypes.STRING, ['logo']),
			get: function() {
				return resolveImgUrl(this.getDataValue('logo'));
			}
	  },
		description: Sequelize.TEXT,
	});

	const SponsorLike = db.define('sponsorLike');
	SponsorLike.belongsTo(User);
	SponsorLike.belongsTo(Sponsor);

	const SponsorLink = db.define('sponsorLink', {
		name: Sequelize.STRING,
		url: Sequelize.STRING
	})
	SponsorLink.belongsTo(Sponsor);
	Sponsor.hasMany(SponsorLink);

	const SponsorMedia = db.define('sponsorMedia', {
		url: Sequelize.STRING
	});
	SponsorMedia.belongsTo(Sponsor);
	Sponsor.hasMany(SponsorMedia);

	const Holiday = db.define('holiday', {
		name: Sequelize.STRING,
		date: {
			type: Sequelize.DATEONLY,
			allowNull: false,
			get: function()  {
				let d = this.getDataValue('date');
				return moment(d).format(DATE_FORMAT);
			},
		},
		date_f: {
			type: new DataTypes.VIRTUAL(DataTypes.DATEONLY, ['date']),
			get: function() {
				return moment(this.getDataValue('date')).format('MMM Do, ddd');
			}
	  },
		backgroundUrl: {
			type: new DataTypes.VIRTUAL(DataTypes.STRING, ['background']),
			get: function() {
				return resolveImgUrl(this.getDataValue('background'));
			}
	  },
		bannerUrl: {
			type: new DataTypes.VIRTUAL(DataTypes.STRING, ['banner']),
			get: function() {
				return resolveImgUrl(this.getDataValue('banner'));
			}
	  },
		url: {
			type: new DataTypes.VIRTUAL(DataTypes.STRING),
			get: function() {
				return 'www.Scover.today';
			}
	  },
		dateEnd: Sequelize.DATEONLY,
		background: Sequelize.STRING,
		banner: Sequelize.STRING,
		description: Sequelize.TEXT,
		recommended: {type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false},
		priority: Sequelize.INTEGER,
		priorityRecommended: Sequelize.INTEGER
	}, {
		getterMethods: {
			categoriesIds: function()  {
				let categories = this.getDataValue('categories');
				if (categories)	{
					return categories.map((a)=> a['id']);
				}
			},
			sponsorsIds: function()  {
				let sponsors = this.getDataValue('sponsors');
				if (sponsors)	{
					return sponsors.map((a)=> a['id']);
				}
			}
  	},
		setterMethods: {
			categoriesKeywords: function([categoriesIds, keywords]) {
				if (Array.isArray(categoriesIds)) {
					let p = categoriesIds.map( id => Category.findById(id) );
					return Promise.all(p)
						.then(categories => {
							for(let c of categories) {
								let keyword = keywords[c.id];
								c.holidayCategories = {keyword};
							}
							return this.setCategories(categories);
						})
				}
			},
			categoriesIds: function(ids)  {
				if (Array.isArray(ids))
					return this.setCategories(ids)
			},
			sponsorsIds: function(ids)  {
				if (Array.isArray(ids))
					return this.setSponsors(ids)
			},
		}
	});
	const HolidayCategories = db.define('holidayCategories', {
		keyword: {type:DataTypes.STRING}
	});
	Holiday.belongsToMany(Category, {through:HolidayCategories});
	Category.belongsToMany(Holiday, {through:HolidayCategories});
	Holiday.belongsToMany(Sponsor, {through:'holidaySponsor'});

	const Location = db.define('location', {
		placeId: {type: Sequelize.STRING, unique: true, allowNull: false},
		name: Sequelize.STRING,
		vicinity: Sequelize.STRING,
		json: Sequelize.JSONB
	}, {
		hooks : {
			afterCreate: (location, options) => {
				const places = new GooglePlaces(cfg.googleAPIKey);
				places.details({placeid:location.placeId})
					.then( ({body, body:{result:{name, vicinity}}}) =>
						name&&vicinity ? location.update({name, vicinity, json: body}) : location
					);
				return null;
			}
		}
	});
	const LocationLike = db.define('locationLike', {
		liked: {type: Sequelize.BOOLEAN},
	});
	Location.belongsToMany(User, {through: LocationLike });
	User.belongsToMany(Location, {through: LocationLike });

	const Checkin = db.define('checkin', {
	});
	User.hasMany(Checkin);
	Location.hasMany(Checkin);
	Checkin.belongsTo(Location);

	const Bookmark = db.define('bookmark', {
	});
	User.hasMany(Bookmark);
	Holiday.hasMany(Bookmark);
	Location.hasMany(Bookmark);
	Bookmark.belongsTo(Location);
	Bookmark.belongsTo(Holiday);
	Bookmark.belongsTo(User);

	const Photo = db.define('photo', {
		name: Sequelize.STRING,
		img: {type: Sequelize.STRING, unique: true},
		imgUrl: {
			type: new DataTypes.VIRTUAL(DataTypes.STRING, ['img']),
			get: function() {
				return resolveImgUrl(this.getDataValue('img'));
			}
	  },
		coordinates: Sequelize.STRING,
	});
	User.hasMany(Photo);
	Location.hasMany(Photo);
	Photo.belongsTo(Location);

	const HomeSection = db.define('homeSection', {
		title: Sequelize.STRING,
		description: Sequelize.TEXT,
		background: {type: Sequelize.STRING, unique: true},
		backgroundUrl: {
			type: new DataTypes.VIRTUAL(DataTypes.STRING, ['background']),
			get: function() {
				return resolveImgUrl(this.getDataValue('background'));
			}
		},
	}, {
		getterMethods: {
			sponsorsIds: function()  {
				let sponsors = this.getDataValue('sponsors');
				if (sponsors)	{
					return sponsors.map((a)=> a['id']);
				}
			}
  	}
	});
	HomeSection.belongsToMany(Sponsor, {through:'homeSectionSponsor'});

	const Alarm = db.define('alarm', {
		triggerAt: Sequelize.DATE
	});
	Alarm.belongsTo(Holiday);
	Alarm.belongsTo(User);

	const DeviceToken = db.define('deviceToken', {
		token: Sequelize.STRING,
	});
	DeviceToken.belongsTo(User);

	//User.sync({force:true});

	db.sync().then( () => {

		Holiday.count().then( c => {
			if (0 == c) {
				for (const h of holidaysBootstrap) {
					Holiday.create({
						name: h.name,
						date: moment(h.day+'-'+h.month+'-2017', 'D-M-YYYY').format(DATE_FORMAT),
						background: null,
						banner: null,
					});
				}
			}
		})
		.then(()=>
			Category.count().then( c =>
				c>0 ? null :
				Promise.all([
					Category.create({
						name: 'Dining',
						picture: 'dining-active.png',
						inactive: 'dining-inactive.png'
					}),
					Category.create({
						name: 'Alcohol',
						picture: 'alcohol-active.png',
						inactive: 'alcohol-inactive.png'
					}),
					Category.create({
						name: 'Coffee',
						picture: 'coffee-active.png',
						inactive: 'coffee-inactive.png'
					}),
					Category.create({
						name: 'Shopping',
						picture: 'shop-active.png',
						inactive: 'shop-inactive.png'
					})])
				)
		)
		.then(()=>
			Holiday.findAll({ where: { date: { $between: ['2017-07-01', '2017-07-31'] }}})
			.then(hs => {

				return null;
				Promise.all([
					Category.findOne({where:{name:'Dining'}}),
					Category.findOne({where:{name:'Coffee'}}),
					Category.findOne({where:{name:'Alcohol'}}),
					Category.findOne({where:{name:'Shopping'}})])
				.then( ([c1, c2, c3, c4]) => {
					for(let h of hs) {
						c1.holidayCategories = {keyword:'restaurant'};
						c2.holidayCategories = {keyword:'coffee'};
						c3.holidayCategories = {keyword:'alcohol'};
						c4.holidayCategories = {keyword:'shop'};
						h.setCategories( [c1, c2, c3, c4].sort(() => .5 - Math.random()).slice(0,Math.floor(Math.random() * 4)) );
					}
				});

			})
		)
		.then(() =>
			HomeSection.count().then( c =>
				c>0 ? null :
				Promise.all([
					HomeSection.create({
						title: 'Scover Today',
						description: 'today holidays',
						background: 'home_bg_today.png'
					}),
					HomeSection.create({
						title: 'Recommended',
						description: 'scover recommended',
						background: 'home_bg_recommended.png'
					}),
					HomeSection.create({
						title: 'Upcoming',
						description: 'upcoming holidays',
						background: 'home_bg_upcoming.png'
					}),
				])
			)
		)
		.then(()=> Holiday.findAll({where:{date:{$between:['2017-07-01', '2017-07-31']}}}))
		.then(holidays=> {
			return null;
			const files = fs.readdirSync('uploads/July');
			for (let h of holidays) {
				let background = ''+h.id+'a';
				background = files.find(f=>f.split('.')[0]==background);
				background = background ? 'July/'+background : undefined;
				let banner = ''+h.id+'b';
				banner = files.find(f=>f.split('.')[0]==banner);
				banner = banner ? 'July/'+banner : undefined;
				if (banner||background) {
					h.update({banner, background})
				}
			}
		})
		.then(()=>Sponsor.count())
		.then((c)=>{
			if (c == 0) {
				Sponsor.create({
					name:'Dynamics In Play LLC',
					description:'a small, new organization in the custom computer programming services industry located in New York, NY. It opened its doors in and now has $200,000 USD in yearly revenue and 2 employees.',
					logo:'spo_logo.png',
					sponsorLinks: [
						{name: 'website', url:'http://dynamicsinplay.com/'},
						{name: 'facebook', url:'https://fb.com'},
						{name: 'instagram', url:'https://www.instagram.com'},
						{name: 'google+', url:'https://plus.google.com'},
						{name: 'youtube', url:'https://youtube.com'}
					],
					sponsorMedia: [
						{url: 'https://emotiondynamics.org/wp-content/uploads/2016/03/Karla_Home_banner_smoke_Rainbow_EmoDynAtWork_1170-KO_R.jpg'},
						{url: 'http://www.safetydynamicsllc.com/uploads/4/8/9/6/48961747/2075881201_orig.png'},
						{url: 'https://www.youtube.com/watch?v=pIvQFXOYIio'},
					]
				},
				{
					include: [SponsorLink, SponsorMedia]
				})
			}
		})
	})
	.then( ()=>Alarm.findAll() )
	.then(alarms => {
		let now = moment();
		for (let a of alarms) {
			if (moment(a.triggerAt).isBefore(now)) {
				a.destroy();
			} else {
				pushNotification(a);
			}
		}
	})
}


export default callback => {
	// connect to a database if needed, then pass it to `callback`:sc0v3r321!
	let sequelize = new Sequelize('postgres://scover:sc0v3r@localhost:5432/scover');
	sequelize
  .authenticate()
  .then(function(err) {
    console.log('Connection has been established successfully.');
		initializeModels(sequelize)
		callback(sequelize);
  })
  .catch(function (err) {
    console.log('Unable to connect to the database:', err);
  });

}
