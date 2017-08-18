import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DragSource, DropTarget } from 'react-dnd';
import flow from 'lodash/flow';
import Paper from 'material-ui/Paper';
import ContentCreate from 'material-ui/svg-icons/content/create';
import { Link } from 'react-router-dom';
import FlatButton from 'material-ui/FlatButton';

const style = {
  cursor: 'move',
};

const cardSource = {
  beginDrag(props) {
    return {
      id: props.id,
      holidayId: props.row.id,
      originalIndex: props.findCard(props.id).index,
    };
  },

  endDrag(props, monitor) {
    const { id: droppedId, originalIndex } = monitor.getItem();
    const didDrop = monitor.didDrop();

    if (!didDrop || monitor.getDropResult().recommended) {
      props.moveCard(droppedId, originalIndex);
    }
  },
};

const cardTarget = {
  canDrop() {
    return false;
  },

  hover(props, monitor) {
    const { id: draggedId, holidayId } = monitor.getItem();
    const { id: overId } = props;

    if (props.canHover(holidayId) && draggedId !== overId) {
      const { index: overIndex } = props.findCard(overId);
      props.moveCard(draggedId, overIndex);
    }
  },
};

function collect(connect, monitor) {
  return {
    // Call this function inside render()
    // to let React DnD handle the drag events:
    connectDragSource: connect.dragSource(),
    // You can ask the monitor about the current drag state:
    isDragging: monitor.isDragging()
  };
}
function connect(connect) {
  return {
    connectDropTarget: connect.dropTarget(),
  }
}

class HolidayItem extends Component {

  render() {
    const { recommended, row, isDragging, connectDragSource, connectDropTarget } = this.props;
    const border = isDragging ? '1px dotted #ff4081' : undefined;
    const display = recommended ? 'inline-block' :undefined;

    return connectDragSource(connectDropTarget(
      <div  style={{ ...style, border, display }}>
      <Paper className="holiday">
      {recommended ? ''
        :
        <FlatButton
            style={{color:'#777',transform: 'scale(0.75)',float:'right', padding: '0', margin:'-8px', height: '', lineHeight:'', minWidth:''}}
            icon={<ContentCreate />}
            containerElement={<Link to={'holidays/'+row.id} />}
        />
      }
      {row.name}
      </Paper>
      </div>,
    ));
  }
}

HolidayItem.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
  id: PropTypes.any.isRequired,
  row: PropTypes.any.isRequired,
  moveCard: PropTypes.func.isRequired,
  findCard: PropTypes.func.isRequired,
};

export default flow(
  DragSource('Holiday', cardSource, collect),
  DropTarget('Holiday', cardTarget, connect)
)(HolidayItem);
