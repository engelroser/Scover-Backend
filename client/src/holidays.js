import React, {Component} from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';

import {
  List,
  Create,
  Datagrid,
//  DateField,
  Edit,
  EditButton,
  Filter,
  SelectInput,
  ReferenceArrayInput,
  SelectArrayInput,
  SimpleForm,
  TextField,
  TextInput,
  LongTextInput,
  ImageInput,
  ImageField,
  required,
 } from 'admin-on-rest';
import DateInput from './components/DateInput'
import {datagridStyles} from './styles';
import {monthsDates} from './Month.js';

import { CardActions } from 'material-ui/Card';
import FlatButton from 'material-ui/FlatButton';
import NavigationRefresh from 'material-ui/svg-icons/navigation/refresh';
import {CreateButton} from 'admin-on-rest';
import { fetchJson } from 'admin-on-rest/lib/util/fetch'
import Toggle from 'material-ui/Toggle';
import Paper from 'material-ui/Paper';
import DropDownMenu from 'material-ui/DropDownMenu';
import MenuItem from 'material-ui/MenuItem';
import ContentCreate from 'material-ui/svg-icons/content/create';
import CategoriesKeywordsInput from './components/CategoriesKeywordsInput';
import HolidaySortable from './components/HolidayList';
import HolidayRecommended from './components/DropContainer';
import _isEqual from 'lodash/isEqual';
import _sortBy from 'lodash/sortBy';
import './holidays.css';

const cardActionStyle = {
    zIndex: 2,
    display: 'inline-block',
    float: 'right',
};

const dateParser = d => {
  if (!(d instanceof Date) || isNaN(d)) return;
  return moment(d).format('YYYY-MM-DD');
};
const dateFormatter = d => moment(d).format('MMM Do');

const monthsChoices = monthsDates().map(m => ({
  id: m.start.format('YYYY-MM-DD'),
  name: m.start.format('MMM')
}));

const weeks = (() => {
  let a = [];
  let m = moment.utc().startOf('d').week(1).isoWeekday(1);
  let n = m.weeksInYear();
  let d1,d2;
  for (let i =0; i<n; i++) {
    d1 = m.clone();
    m.add(7,'d');
    d2 = m.clone().subtract(1,'s');
    a.push({
      id: i,
      start:d1,
      end: d2,
      name: 'Week '+d1.week(),
      descr: d1.format('MMM Do')+' - '+d2.format('MMM Do'),
    });
  }
  return a;
})()

//const filterValues = {month: moment().startOf('M').format('YYYY-MM-DD')};

let p = Promise.resolve();

class MonthFilter extends Component {

  constructor(props) {
    super(props);
    this.defaultValue = moment().startOf('M').format('YYYY-MM-DD');
  }

  componentDidMount() {
  }
  componentDidUpdate() {

  }
  componentWillReceiveProps = nextProps => {
    this.forceUpdate();
  }
  render () { return (
    <Filter {...this.props} ref={(filter) => { this.filter = filter; }} >
      <TextInput label="Search" source="q" alwaysOn />
      <SelectInput
        source="month" alwaysOn allowEmpty choices={this.props.choices} defaultValue={this.defaultValue}/>
    </Filter>
  )}
};

let f, fv;

const HolidayActions = (props) => {
  let {toggled, toggle, resource, filters, displayedFilters, filterValues, basePath, showFilter, refresh } = props;
  f = showFilter;
  fv = filterValues;
  let fff = toggled ? '' :
    filters && React.cloneElement(filters, { resource, showFilter, displayedFilters, filterValues, context: 'button' })
  return (
    <CardActions style={cardActionStyle}>

        <Toggle
          label="Weeks" defaultToggled={toggled}
          onToggle={toggle}
          style={{verticalAlign: 'middle',lineHeight:'36px', display:'inline-block', width: 'auto'}}
          labelStyle={{fontFamily: 'Roboto, sans-serif', color:'#00bcd4', textTransform:'uppercase', fontSize:'14px'}}
        />
        {fff}
        <CreateButton basePath={basePath} />
        <FlatButton primary label="refresh" onClick={refresh} icon={<NavigationRefresh />} />
    </CardActions>
  )
};

export class HolidayList extends Component {
  constructor(props) {
    super(props);
    this.monthsChoices = monthsChoices;
    this.weeks = weeks;

    let m = moment();
    this.curWeek = this.weeks.find(w=> m.isBetween(w.start, w.end) );

    p = fetchJson('/api/holidays/months').then(a=>this.updateSelectOptions(a.json.months));
    fetchJson('/api/holidays/weeks').then(a=>this.updateWeeksHolidays(a.json.weeks));
    this.requestWeek(this.curWeek.id)
  }
  requestWeek(id) {
    fetchJson('/api/holidays/weeks/'+id)
    .then(a => this.updateWeek(a.json.week, id) );
  }
  updateWeek(weekHolidays, id) {
    this.curWeek = this.weeks.find( w=> w.id == id);
    this.setState({weekHolidays, modified: false, week:this.curWeek});
    f();
  }
  updateSelectOptions(months) {
    let x;
    for (let m of months) {
      x = this.monthsChoices.find( a => a.id == m.d1);
      x.name = moment(m.d1).format('MMM')+' - '+m.count+' holidays';
    }
  }
  updateWeeksHolidays(weeks) {
    let x;
    for (let i in weeks) {
      x = this.weeks.find( a => a.id == i );
      if (x) x.holidays = weeks[i].count;
    }
    this.setState({ weeks: this.weeks});
  }

  componentWillMount() {
    if (!this.state || !this.state.weeks) {
      this.setState( {weeks: this.weeks} );
    }
    this.setState({showWeeks:true, week:this.curWeek});
  }
  componentDidMount() {
  }
  componentDidUpdate() {
  }
  componentWillUpdate() {

  }
  toggleView(bool) {
    this.setState({showWeeks:bool});
    this.forceUpdate();
    if (!bool) {
      f('month', fv.month ? fv.month : moment().startOf('M').format('YYYY-MM-DD'))
    } else {
      f();
    }
  }

  showWeek(id) {
    this.requestWeek(id);
  }

  getUpcoming() {
    let m = moment();
    if (this.state.weekHolidays && m.isBetween(this.curWeek.start, this.curWeek.end)) {
      return this.state.weekHolidays.filter(h=> m.isBefore(h.date));
    }
  }
  getRecommended() {
    if (this.state.weekHolidays) {
      return _sortBy(this.state.weekHolidays.filter(h=> h.recommended), ['priorityRecommended']);
    } else return [];
  }

  recommend(holiday) {
    this.state.weekHolidays.find(h => h.id == holiday).recommended = true;
    this.setState({modified: true, weekHolidays: this.state.weekHolidays});
    f();
  }
  unrecommend(holiday) {
    this.state.weekHolidays.find(h => h.id == holiday).recommended = false;
    this.setState({modified: true, weekHolidays: this.state.weekHolidays});
    f();
  }
  saveRecommendedAndOrder(recommended) {
    for (let i in recommended) {
      recommended[i].priorityRecommended = i;
    }
    let body = JSON.stringify(this.state.weekHolidays);
    fetchJson('/api/holidays/', {method:'PUT', body}).then(a=>this.updateWeek(a.json, this.curWeek.id));
  }

  reorderRecommended(recommended = []) {
    if (recommended.length) {
      const ids = recommended.map(v => v.id);
      const holidays = this.state.weekHolidays.filter( h => ids.includes(h.id) );
      const prevIdsOrder = _sortBy(holidays, ['priorityRecommended']).map(h=>h.id);

      if (!_isEqual(ids, prevIdsOrder)) {
        for (let h of holidays) {
          h.priorityRecommended = ids.indexOf(h.id);
        }
        this.setState({modified: true});
        f();
      }
    }

  }
  reorderHolidays(holidays = []) {
    if (holidays.length) {
      const d = holidays[0].date;
      const dayHolidays = this.state.weekHolidays.filter( h => h.date==d );
      const prevIdsOrder = dayHolidays.map(h=>h.id);
      const ids = holidays.map(h=>h.id);
      if (!_isEqual(ids, prevIdsOrder)) {
        for (let h of dayHolidays) {
          h.priority = ids.indexOf(h.id);
        }
        this.setState({modified: true});
        f();
      }
    }
  }
  handleMenuChange(event, index, value) {
    this.showWeek(value);
  }
  renderList() { return (
    <List
      actions={<HolidayActions toggled={this.state.showWeeks} toggle={(o,b)=>this.toggleView(b)}/>}
      ref={(list) => { this.list = list; }}
      { ...this.props } title="Holidays" perPage={15} sort={{ field: 'date', order: 'ASC' }}
      filters={<MonthFilter choices={this.monthsChoices}/>} >
        <Datagrid styles={datagridStyles}>
            <EditButton label=""/>
            <TextField source="date_f" label="date" sortable={false} />
            <TextField source="name" />
        </Datagrid>
    </List>
  )}

  renderWeek() {
    let week = this.curWeek;
    let holidaysRows = false;//this.prepareRows(week, this.state.weekHolidays);
    let holidayCols = this.prepareCols(week, this.state.weekHolidays);
    let rowsN = holidaysRows.length;
    let id = this.curWeek.id > 0 ? this.curWeek.id-1 : 0;
    let weeksBig = weeks.slice(id,id+8);
    let upcoming = this.getUpcoming();
    let recommended = this.getRecommended();
    let weekdays = [];
    for (let m = week.start.clone(); week.end.isAfter(m); m.add(1, 'd') ) {
      weekdays.push(m.format('MMM Do'));
    }
    return (
    <List
      actions={<HolidayActions toggled={this.state.showWeeks} toggle={(o,b)=>this.toggleView(b)}/>}
      ref={(list) => { this.list = list; }}
      { ...this.props } pagination={null} title="Holidays" perPage={15} sort={{ field: 'date', order: 'ASC' }}  >
      <ListSub >

      <div className="weeks">
      <DropDownMenu maxHeight={400} value={week.id} onChange={this.handleMenuChange.bind(this)}>
      {weeks.map((w,i)=> (
        <MenuItem value={i} key={i} primaryText={w.name}/>
      ))}
      </DropDownMenu>
      </div>

      <div className="weeksBig">
      {weeksBig.map(w=> (
        <Paper style={{backgroundColor:'', boxShadow:''}}
          key={'b'+w.id} className={week.id==w.id? 'selected week': 'week'} onClick={this.showWeek.bind(this, w.id)}>
          <span className="name">{w.name}</span>
          <div className="descr">{w.descr}</div>
          <div className="holidays">{w.holidays ? `${w.holidays} holidays`: null}</div>
        </Paper>
      ))}
      </div>
      <div className="tholder">
      <table className="week"><tbody>
        <tr>
          <td className="first"><div>{week.name}</div><div className="caption" style={{whiteSpace:"nowrap"}}>{week.descr}</div></td>
          {weekdays.map(d =>
            <td key={d} className="caption pad5">{d}</td>
          )}
        </tr>
        <tr className="weekday">
          <td className="first"><div>Week Days</div></td>
          <td>monday</td><td>tuesday</td><td>wednesday</td><td>thursday</td><td>friday</td><td>saturday</td><td>sunday</td>
        </tr>
        {holidaysRows ? holidaysRows.map((r,i) => (
          <tr key={'r'+i}>
            {i===0 && <td className="first" rowSpan={rowsN}><div>Holidays</div><div className="caption">{week.holidays} holidays</div></td>}
            {r.map((c, y)=> (
              <td key={'c'+i+y} className="weekday">{c ?
                //<Draggable className="draggable" type="holiday" data={c.id} key={c.id}>
                <Paper className="holiday">
                <FlatButton
                    style={{color:'#777',transform: 'scale(0.75)',float:'right', padding: '0', margin:'-8px', height: '', lineHeight:'', minWidth:''}}
                    icon={<ContentCreate />}
                    containerElement={<Link to={'holidays/'+c.id} />}
                />
                {c.name}
                </Paper>
                //</Draggable>
                 : ''}</td>
            ))}
          </tr>
        )) :
          <tr>
          <td className="first"><div>Holidays</div><div className="caption">{week.holidays} holidays</div></td>
          {holidayCols.map( (col,i) => (
            <td className="holidaysColumn" key={i}>

            <HolidaySortable
               items={col}
               onItemsOrderChange={this.reorderHolidays.bind(this)}
              />
            </td>
          ) )}
          </tr>
        }
        <tr><td className="pad5"></td></tr>
        <tr>
          <td className="first"><div>Recommended
            </div>
            </td>
          <td colSpan="7" className="recommendedCell">

            <HolidayRecommended items={recommended}
              onDrop={this.recommend.bind(this)}
              unrecommend={this.unrecommend.bind(this)}
              saveRecommended={this.saveRecommendedAndOrder.bind(this)}
              onReorder={this.reorderRecommended.bind(this)}
              modified={this.state.modified}/>

          </td>
        </tr>
        <tr><td>

        </td></tr>
        {upcoming &&
        <tr>
          <td className="first"><div>Upcoming</div></td>
          <td colSpan="7">{upcoming.map(h=><div key={h.id} className="upcoming">{h.name}</div>)}</td>
        </tr>
        }
        </tbody>
      </table>
      </div>

      </ListSub>
    </List>
  )}

  prepareRows(w, wh) {
    let rows = [];
    if (!wh || !wh.length) return rows;
    let days = {};
    let dateStr;
    let dates = []
    for (let m = w.start.clone(); w.end.isAfter(m); m.add(1, 'd') ) {
      dateStr = m.format('YYYY-MM-DD');
      days[dateStr] = [];
      dates.push(dateStr);
    }
    for (let h of wh) {
      days[h.date].push(h);
    }
    let p = true, h;
    while (p) {
      p = false
      let row = [];
      for (let d of dates) {
        h = days[d].shift();
        if (h) {
          p=true;
          row.push(h);
        } else {
          row.push(null);
        }
      }
      if (p) rows.push(row);
    }
    return rows;
  }

  prepareCols(w, wh) {
    let rows = [];
    if (!wh || !wh.length) return rows;
    let days = {};
    let dateStr;
    let dates = []
    for (let m = w.start.clone(); w.end.isAfter(m); m.add(1, 'd') ) {
      dateStr = m.format('YYYY-MM-DD');
      days[dateStr] = [];
      dates.push(dateStr);
    }
    for (let h of wh) {
      const z = days[h.date];
      if (z) z.push(h);
    }
    return dates.map(k=> _sortBy(days[k], ['priority']));
  }

  render() {
    return !this.state.showWeeks ? this.renderList() : this.renderWeek();
  }
};

const ListSub = props => (<div>{props.children}</div>)

export const HolidayCreate = (props) => (
    <Create {...props}>
        <SimpleForm>

          <TextInput source="name" validate={ required }
            options={{
              fullWidth:true,
            }}/>

          <DateInput source="date" parse={dateParser} validate={ required }
            options={{
              mode: 'portrait',
              minDate: new Date(),
              formatDate: dateFormatter,
              hintText: 'Choose day',

            }}/>

          <ImageInput source="background" label="Background" accept="image/*">
            <ImageField source="" title="title" />
          </ImageInput>

          <ImageInput source="banner" label="Banner" accept="image/*">
            <ImageField source="" title="title" />
          </ImageInput>

          <LongTextInput source="description"
            options={{
              fullWidth:true,
            }}/>

          <CategoriesKeywordsInput label="Categories" source="categoriesIds" reference="categories" allowEmpty />

          <ReferenceArrayInput label="Sponsors" source="sponsorsIds" reference="sponsors" allowEmpty>
            <SelectArrayInput optionText="name" options={{ fullWidth: true }}/>
          </ReferenceArrayInput>

        </SimpleForm>
    </Create>
);
export const HolidayEdit = (props) => (
    <Edit {...props}>

        <SimpleForm>

          <TextInput source="name" validate={ required }
            options={{
              fullWidth:true,
            }}/>

          <DateInput source="date"  parse={dateParser} validate={ required }
            options={{
              mode: 'portrait',
              minDate: new Date(),
              formatDate: dateFormatter,
              hintText: 'Choose day',

            }}/>

          <ImageInput source="background" label="Background" accept="image/*">
            <ImageField source="src" />
          </ImageInput>

          <ImageInput source="banner" label="Banner" accept="image/*">
            <ImageField source="src" />
          </ImageInput>

          <LongTextInput source="description"
            options={{
              fullWidth:true,
            }}/>

          <CategoriesKeywordsInput label="Categories" source="categoriesIds" reference="categories" allowEmpty />

          <ReferenceArrayInput label="Sponsors" source="sponsorsIds" reference="sponsors" allowEmpty>
            <SelectArrayInput optionText="name" options={{ fullWidth: true }}/>
          </ReferenceArrayInput>

        </SimpleForm>
    </Edit>
);
