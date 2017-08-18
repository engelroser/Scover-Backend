import FlatButton from 'material-ui/FlatButton';
import React, { Component } from 'react';
import { FieldArray, Field } from 'redux-form';
import PropTypes from 'prop-types';

import ContentAddIcon from 'material-ui/svg-icons/content/add';
import ActionDeleteIcon from 'material-ui/svg-icons/action/delete';

/**
 * An Input component for generating/editing an embedded array
 *
 *
 * Use it with any set of input componentents as children, like `<TextInput>`,
 * `<SelectInput>`, `<RadioButtonGroupInput>` ... etc.
 *
 * @example
 * export const CommentEdit = (props) => (
 *     <Edit {...props}>
 *         <SimpleForm>
 *              <EmbeddedArrayInput source="links">
 *                  <SimpleList>
 *                       <TextField source="url" />
 *                       <TextField source="context"/>
 *                   </SimpleList>
 *               </EmbeddedArrayInput>
 *         </SimpleForm>
 *     </Edit>
 * );
 */
export class EmbeddedArrayInput extends Component {
    constructor(props) {
        super(props);
        // nothing to do for now
    }

    renderList = ({ fields }) => {
        const { children, arrayElStyle, label, labelAdd } = this.props;
        return (
            <div className="EmbeddedArrayInputContainer" style={{ marginTop: '1em' }}>
              <label className="biggreylabel">{label}</label>
                <div>
                    {
                        fields.map((member, index) =>
                            <ArrayElement key={index} fields={fields} inputs={children} elStyle={arrayElStyle} member={member} index={index} />
                        )
                    }
                </div>
                <FlatButton primary icon={<ContentAddIcon />} label={labelAdd||"Add"} onClick={() => fields.push({})} />
                <div style={{ clear: 'both' }} />
            </div>
        )
    }


    render() {
        const { input, resource, label, source, allowEmpty, basePath, onChange, children, meta } = this.props;

        return (
            <FieldArray name={source} component={this.renderList} />
        )
    }
}

const ArrayElement = ({ fields, inputs, member, index, elStyle }) => {
    const removeElement = () => fields.remove(index);
    const containerStyle = { padding: '0 0 0 1em' };
    return (
        <div style={{marginTop:'-14px', ...elStyle}} className="EmbeddedArrayInputItemContainer">
            <div style={containerStyle}>
                {
                    React.Children.map(inputs, input => input && (
                        <div key={input.props.source}
                          className={`aor-input-${input.props.source}`}
                          style={input.props.style}>
                            <ArrayElementFormField input={input} prefix={member} />
                        </div>
                    ))
                }
              <FlatButton
                  primary
                  icon={<ActionDeleteIcon />}
                  onClick={removeElement} />
            </div>
        </div>
    )
}

import Labeled from 'admin-on-rest/lib/mui/input/Labeled';
import { required } from 'admin-on-rest/lib/mui/form/validate';

const isRequired = (validate) => {
    if (validate === required) return true;
    if (Array.isArray(validate)) {
        return validate.includes(required);
    }
    return false;
};

const ArrayElementFormField = ({ input, prefix, ...rest }) => {

  let source = `${prefix}.${input.props.source}`;

    if (input.props.addField) {
        if (input.props.addLabel) {
            return (
                <Field
                    {...rest}
                    {...input.props}
                    name={source}
                    component={Labeled}
                    label={input.props.label}
                    isRequired={isRequired(input.props.validate)}
                >
                    { input }
                </Field>
            );
        }
        return (
            <Field
                {...rest}
                {...input.props}
                name={source}
                component={input.type}
                isRequired={isRequired(input.props.validate)}
            />
        );
    }
    if (input.props.addLabel) {
        return (
            <Labeled
                {...rest}
                label={input.props.label}
                source={source}
                isRequired={isRequired(input.props.validate)}
            >
                {input}
            </Labeled>
        );
    }
    return (typeof input.type === 'string') ? input : React.cloneElement(input, rest);
};

EmbeddedArrayInput.propTypes = {
    addField: PropTypes.bool.isRequired,
    allowEmpty: PropTypes.bool.isRequired,
    basePath: PropTypes.string,
    children: PropTypes.node,
    label: PropTypes.string,
    meta: PropTypes.object,
    onChange: PropTypes.func,
    input: PropTypes.object,
    resource: PropTypes.string,
    source: PropTypes.string,
    arrayElStyle: PropTypes.object
};

EmbeddedArrayInput.defaultProps = {
    addField: false,
    allowEmpty: false,
    arrayElStyle: {
        display: 'block',
        verticalAlign: 'bottom'
    }
};

export default EmbeddedArrayInput;
