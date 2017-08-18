import React from 'react';
import {
  List,
  Create,
  Datagrid,
  Edit,
  EditButton,
  SimpleForm,
  TextField,
  TextInput,
  ImageInput,
  ImageField,
  required
 } from 'admin-on-rest';

import {datagridStyles} from './styles';

export const CategoryList = (props) => (
    <List {...props} perPage={15} sort={{ field: 'name', order: 'ASC' }}>
        <Datagrid styles={datagridStyles}>
            <EditButton label=""/>
            <TextField source="name" />

        </Datagrid>
    </List>
);

export const CategoryCreate = (props) => (
    <Create {...props}>
        <SimpleForm>

          <TextInput source="name" validate={ required } />

          <ImageInput source="picture" label="Active Icon" accept="image/*">
            <ImageField source="" title="title" />
          </ImageInput>

          <ImageInput source="inactive" label="Inactive Icon" accept="image/*">
            <ImageField source="" title="title" />
          </ImageInput>

        </SimpleForm>
    </Create>
);
export const CategoryEdit = (props) => (
    <Edit {...props}>
        <SimpleForm>

          <TextInput source="name" validate={ required } />

          <ImageInput source="picture" label="Active Icon" accept="image/*">
            <ImageField source="src" />
          </ImageInput>

          <ImageInput source="inactive" label="Inactive Icon" accept="image/*">
            <ImageField source="src" />
          </ImageInput>

        </SimpleForm>
    </Edit>
);
