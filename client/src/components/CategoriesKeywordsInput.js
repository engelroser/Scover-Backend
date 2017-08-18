import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Field } from 'redux-form';
import debounce from 'lodash.debounce';
import {
    crudGetMany as crudGetManyAction,
    crudGetMatching as crudGetMatchingAction,
} from 'admin-on-rest';
import { getPossibleReferences } from 'admin-on-rest/lib/reducer/references/possibleValues';
import MenuItem from 'material-ui/MenuItem';
import SelectField from 'material-ui/SelectField';
import TextField from 'material-ui/TextField';

const renderTextField = ({ input, label, meta: { touched, error }, ...custom }) => (
    <TextField
        hintText={label}
        floatingLabelText={label}
        errorText={touched && error}

        {...input}
        {...custom}

    />
);


const referenceSource = (resource, source) => `${resource}@${source}`;

export class CategoriesKeywordsInput extends Component {
    constructor(props) {
        super(props);
        const { perPage, sort, filter } = props;
        // stored as a property rather than state because we don't want redraw of async updates
        this.params = { pagination: { page: 1, perPage }, sort, filter };
        this.debouncedSetFilter = debounce(this.setFilter.bind(this), 500);
    }

    componentDidMount() {
        this.fetchReferenceAndOptions();
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.record.id !== nextProps.record.id) {
            this.fetchReferenceAndOptions(nextProps);
        }
        const keywords = {};
        if (this.props.record.categories) {
          for (let r of this.props.referenceRecords) {
            let c = this.props.record.categories.find(o=>o.id==r.id);
            if (c) keywords[c.id] = c.holidayCategories.keyword;
          }
        }
        this.props.record.keywords = keywords;
    }

    setFilter = (filter) => {
        if (filter !== this.params.filter) {
            this.params.filter = this.props.filterToQuery(filter);
            this.fetchReferenceAndOptions();
        }
    }

    setPagination = (pagination) => {
        if (pagination !== this.param.pagination) {
            this.param.pagination = pagination;
            this.fetchReferenceAndOptions();
        }
    }

    setSort = (sort) => {
        if (sort !== this.params.sort) {
            this.params.sort = sort;
            this.fetchReferenceAndOptions();
        }
    }

    fetchReferenceAndOptions({ input, reference, source, resource } = this.props) {
        const { pagination, sort, filter } = this.params;
        const ids = input.value;
        if (ids) {
            if (!Array.isArray(ids)) {
                throw Error('The value of ReferenceArrayInput should be an array');
            }
            this.props.crudGetMany(reference, ids);
        }
        this.props.crudGetMatching(reference, referenceSource(resource, source), pagination, sort, filter);
    }
    handleChange(event, index, values) {
      this.props.input.onChange(values.map(o=>o.id))
    }
    render() {
      const { label, referenceRecords, matchingReferences} = this.props;
      const referenceIds = referenceRecords.map(o=>o.id);

      return (
        <div>

        <div className="categories">
          <SelectField style={{minWidth:'200px'}}
            multiple={true}
            hintText={label}
            floatingLabelText={label}
            value={referenceRecords}
            fullWidth={true}
            autoWidth={true}
            onChange={this.handleChange.bind(this)}
          >
            {matchingReferences.map(r=>(
              <MenuItem
                key={r.name}
                insetChildren={true}
                checked={referenceIds.includes(r.id)}
                value={r}
                primaryText={r.name}
              />
            ))}
          </SelectField>
        </div>
        <div className={referenceRecords.length ? "keywords" : "hidden"}>
          <label className="greylabel">Keywords</label>
          {referenceRecords.map((r,i) =>
            <div key={'ck'+r.id} >
              <label>{r.name}:&nbsp;
                <Field name={'keywords['+r.id+']'}
                  component={renderTextField} />
              </label>
            </div>
          )}
        </div>

        </div>
      );
    }
}

CategoriesKeywordsInput.propTypes = {
    addField: PropTypes.bool.isRequired,
    allowEmpty: PropTypes.bool.isRequired,
    basePath: PropTypes.string,
    //children: PropTypes.element.isRequired,
    crudGetMatching: PropTypes.func.isRequired,
    crudGetMany: PropTypes.func.isRequired,
    filter: PropTypes.object,
    filterToQuery: PropTypes.func.isRequired,
    input: PropTypes.object.isRequired,
    label: PropTypes.string,
    matchingReferences: PropTypes.array,
    meta: PropTypes.object,
    onChange: PropTypes.func,
    perPage: PropTypes.number,
    reference: PropTypes.string.isRequired,
    referenceRecords: PropTypes.array,
    resource: PropTypes.string.isRequired,
    sort: PropTypes.shape({
        field: PropTypes.string,
        order: PropTypes.oneOf(['ASC', 'DESC']),
    }),
    source: PropTypes.string,
};

CategoriesKeywordsInput.defaultProps = {
    allowEmpty: false,
    filter: {},
    filterToQuery: searchText => ({ q: searchText }),
    matchingReferences: [],
    perPage: 25,
    sort: { field: 'id', order: 'DESC' },
    referenceRecords: [],
};

function mapStateToProps(state, props) {
    const referenceIds = props.input.value || [];
    const data = state.admin[props.reference].data;
    return {
        referenceRecords: referenceIds.reduce((references, referenceId) => {
            if (data[referenceId]) {
                references.push(data[referenceId]);
            }
            return references;
        }, []),
        matchingReferences: getPossibleReferences(
            state,
            referenceSource(props.resource, props.source),
            props.reference,
            referenceIds,
        ),
    };
}

const ConnectedReferenceInput = connect(mapStateToProps, {
    crudGetMany: crudGetManyAction,
    crudGetMatching: crudGetMatchingAction,
})(CategoriesKeywordsInput);

ConnectedReferenceInput.defaultProps = {
    addField: true,
};

export default ConnectedReferenceInput;
