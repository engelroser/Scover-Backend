import React, { Component } from 'react';
import PropTypes from 'prop-types';
import update from 'react/lib/update';
import { DropTarget } from 'react-dnd';
import HolidayItem from './HolidayItem';
import flow from 'lodash/flow';


const cardTarget = {
  drop(props, monitor, component) {
    component.onDrop();
  },
};

class Container extends Component {

  constructor(props) {
    super(props);
    this.moveCard = this.moveCard.bind(this);
    this.findCard = this.findCard.bind(this);
    this.canHover = this.canHover.bind(this);
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
  onDrop() {
    this.props.onItemsOrderChange(this.state.cards.map(v=>v.row));
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
    const card = cards.filter(c => c.id === id)[0];

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
        {cards.map(card => (
          <HolidayItem
            key={card.id}
            id={card.id}
            row={card.row}
            moveCard={this.moveCard}
            findCard={this.findCard}
            canHover={this.canHover}
          />
        ))}
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
