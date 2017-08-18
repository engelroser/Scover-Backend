import { version } from '../../package.json';
import { Router } from 'express';
import holidays, {holidaysMonths,holidaysWeeks, holidaysUpdate, holidaysLocations} from './holidays';
import categories from './categories'
import sponsors, {sponsorLike, sponsorUnlike} from './sponsors'
import photos from './photos'
import {locationLike, locationInfo, locationPhotos, postCheckin} from './locations'
import {holidaysSearch} from './holidays'
import bookmarks, {bookmarksSearch} from './bookmarks'
import homeSections from './homeSections'
import {checkins, profile, updateAvatar} from './user'
import {postAlarm} from './holidays'

const searchmw = ({query:{search}}, res, next) =>
	(search === undefined) ? next('route') : next();

export default ({ config, db }) => {
	let api = Router();

	api.get('/profile', profile({ config, db}));
	api.put('/profile', updateAvatar({ config, db}));
	api.get('/checkins', checkins({ config, db}));
	api.get('/bookmarks/:entity', bookmarksSearch({ config, db}));
	api.post('/locations/:placeId/checkins', postCheckin({ config, db}));
	api.get('/holidays', searchmw, holidaysSearch({ config, db}));
	const locLike = locationLike({config, db});
	api.post('/locations/:placeId/:like(dislike|like)', locLike);
	api.delete('/locations/:placeId/:like(dislike|like)', locLike);
	api.get('/locations/:placeId', locationInfo({config, db}));
	api.get('/locations/:placeId/photos', locationPhotos({config, db}));
	api.post('/holidays/:id/alarm', postAlarm({config,db}))
	api.get('/holidays/:id/locations', holidaysLocations({ config, db }));
	api.put('/holidays', holidaysUpdate({ config, db })); //set recommended
	api.get('/holidays/weeks/:id?', holidaysWeeks({ config, db }));
	api.get('/holidays/months', holidaysMonths({ config, db }));
	api.use('/holidays', holidays({ config, db }));
	api.use('/categories', categories({ config, db }));
	api.use('/sponsors', sponsors({ config, db }));
	api.post('/sponsors/:sponsorId/like', sponsorLike({ config, db }))
	api.delete('/sponsors/:sponsorId/like', sponsorUnlike({ config, db }))
	api.use('/photos', photos({ config, db}));
	api.use('/bookmarks', bookmarks({ config, db}));
	api.use('/home', homeSections({ config, db}));
	// expose some API metadata at the root
	api.get('/', (req, res) => {
		res.json({ version });
	});

	return api;
}
