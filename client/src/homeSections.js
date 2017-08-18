import React from 'react';
import {
  List,
  Datagrid,
  Edit,
  EditButton,
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
import {datagridStyles} from './styles';

export const HomeSectionList = (props) => (
  <List title="Home Sections" {...props}>
    <Datagrid styles={datagridStyles}>
      <EditButton label=""/>
      <TextField source="title"  sortable={false}/>
      <TextField source="description"  sortable={false}/>
      <TextField source="amount" label="#" sortable={false}/>
      <ImageField source="backgroundUrl" label="background" title="background" sortable={false} />

    </Datagrid>
  </List>
);
const HomeSectionTitle = ({record}) => (
  <span>{record ? record.title : 'Section Edit'}</span>
)
export const HomeSectionEdit = (props) => (
  <Edit title={<HomeSectionTitle/>} {...props}>
    <SimpleForm>

    <TextInput source="title" validate={ required }
      options={{
      fullWidth:true,
    }}/>
    <LongTextInput source="description"
      options={{
      fullWidth:true,
    }}/>
    <ImageInput source="background" label="Background" accept="image/*">
      <ImageField source="src" />
    </ImageInput>

    <ReferenceArrayInput label="Sponsors" source="sponsorsIds" reference="sponsors" allowEmpty>
      <SelectArrayInput optionText="name" options={{ fullWidth: true }}/>
    </ReferenceArrayInput>

    </SimpleForm>
  </Edit>
);
