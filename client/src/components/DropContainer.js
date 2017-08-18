import React, { Component } from 'react';
import PropTypes from 'prop-types';
import update from 'react/lib/update';
import { DropTarget } from 'react-dnd';
import HolidayItem from './HolidayItem';
import flow from 'lodash/flow';
import RaisedButton from 'material-ui/RaisedButton';
import ContentSave from 'material-ui/svg-icons/content/save';
import { pinkA200 } from 'material-ui/styles/colors';
import RemoveCircle from 'material-ui/svg-icons/content/remove-circle';
import FlatButton from 'material-ui/FlatButton';

const cardTarget = {
  drop(props, monitor, component) {
    const { holidayId } = monitor.getItem();
    if (component.canHover(holidayId)) {
      component.onReorder();
    } else {
      component.addItem(holidayId);
      component.onReorder();
      return {recommended:true};
    }
  },
};

class Container extends Component {

  constructor(props) {
    super(props);
    this.moveCard = this.moveCard.bind(this);
    this.findCard = this.findCard.bind(this);
    this.canHover = this.canHover.bind(this);
    this.addItem = this.addItem.bind(this);
    this.stateFromProps(props);
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps != this.props)
      this.stateFromProps(nextProps);
  }
  stateFromProps(props) {
    this.state = {
      cards: props.items.map((v,i)=> ({id:i, row:v})),
      allowedIds: props.items.map(v=>v.id),
    };
  }
  addItem(holidayId) {
    this.props.onDrop(holidayId);
  }
  onReorder() {
    this.props.onReorder(this.state.cards.map(v=>v.row));
  }
  moveCard(id, atIndex) {
    const { card, index } = this.findCard(id);
    this.setState(update(this.state, {
      cards: {
        $splice: [
          [index, 1],
          [atIndex, 0, card],
        ],
      },
    }));
  }

  findCard(id) {
    const { cards } = this.state;
    const card = cards.filter(c => c ? c.id === id: false)[0];

    return {
      card,
      index: cards.indexOf(card),
    };
  }

  canHover(holidayId) {
    return this.state.allowedIds.includes(holidayId);
  }

  render() {
    const { connectDropTarget } = this.props;
    const { cards } = this.state;

    return connectDropTarget(
      <div>
      <div className="line">
        {cards.length ? cards.map(card=> (
          <div key={card.id} className="recommended">
          <FlatButton
              style={{padding: '0 3px', margin:'0', height: '', lineHeight:'', minWidth:''}}
              icon={<RemoveCircle color={pinkA200} />}
              onClick={()=>this.props.unrecommend(card.row.id)}
          />
          <HolidayItem
            key={card.id}
            id={card.id}
            row={card.row}
            moveCard={this.moveCard}
            findCard={this.findCard}
            canHover={this.canHover}
            recommended
          />
          </div>
        ))
          :<div className="dropPlaceholder">drag & drop holidays here</div> }
      </div>
      <div className="line">
        {this.props.modified &&
          <RaisedButton
              type="submit"
              label="Save"
              icon={<ContentSave />}
              onClick={()=>this.props.saveRecommended(this.state.cards.map(v=>v.row))}
              primary
              style={{
                  marginLeft:'30px',
                  float:'right',
              }}
          />
        }
      </div>
      </div>,
    );
  }
}

Container.propTypes = {
  connectDropTarget: PropTypes.func.isRequired,
};

export default flow(

  DropTarget('Holiday', cardTarget, connect => ({
    connectDropTarget: connect.dropTarget(),
  })),

)(Container);
