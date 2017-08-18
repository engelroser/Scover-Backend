import React, { Component } from 'react';
import { jsonServerRestClient, Admin, Resource, Delete } from 'admin-on-rest';
import './App.css';

import addUploadFeature from './addUploadFeature';
import {HolidayList, HolidayCreate, HolidayEdit} from './holidays'
import {CategoryList, CategoryCreate, CategoryEdit} from './categories'
import {SponsorList, SponsorCreate, SponsorEdit} from './sponsors'
import {HomeSectionList, HomeSectionEdit} from './homeSections'
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

class App extends Component {
  render() {
    return (
      <Admin title="Scover Content Management" restClient={addUploadFeature(jsonServerRestClient('/api'))}>
        <Resource name="home" options={{ label: 'Scover Home' }} list={HomeSectionList} edit={HomeSectionEdit}/>
        <Resource name="holidays" list={HolidayList} create={HolidayCreate} edit={HolidayEdit} remove={Delete}/>
        <Resource name="categories" list={CategoryList} create={CategoryCreate} edit={CategoryEdit} remove={Delete}/>
        <Resource name="sponsors" list={SponsorList} create={SponsorCreate} edit={SponsorEdit} remove={Delete}/>
      </Admin>
    );
  }
}
export default DragDropContext(HTML5Backend)(App);
