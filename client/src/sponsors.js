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
  LongTextInput,
  ImageInput,
  ImageField,
  required,
 } from 'admin-on-rest';
import ArrayInput from './components/EmbeddedArrayInput'

import {datagridStyles} from './styles';

export const SponsorList = (props) => (
    <List {...props} perPage={15} sort={{ field: 'name', order: 'ASC' }}>
        <Datagrid styles={datagridStyles}>
            <EditButton label=""/>
            <TextField source="name" />

        </Datagrid>
    </List>
);

export const SponsorCreate = (props) => (
    <Create {...props}>
        <SimpleForm>

          <TextInput source="name" validate={ required } />

          <ImageInput source="logo" label="Logo" accept="image/*">
            <ImageField source="" title="title" />
          </ImageInput>

          <LongTextInput source="description"
            options={{
              fullWidth:true,
            }}/>

            <ArrayInput source="links" label="Links" labelAdd="Add Link">
                <TextInput source="name" label="Name" options={{ fullWidth: true }} style={{display:'inline-block', width:'23%', paddingRight: '2%' }}/>
                <TextInput source="url" label="Url" options={{ fullWidth: true }}  style={{display:'inline-block', width:'60%', }}/>
            </ArrayInput>

            <ArrayInput source="mediaObjs" label="Media" labelAdd="Add Media">
              <TextInput source="url" label="Url" options={{ fullWidth: true }} style={{display:'inline-block', width: '85%' }}/>
            </ArrayInput>

        </SimpleForm>
    </Create>
);
export const SponsorEdit = (props) => {
  return (
    <Edit {...props}>
        <SimpleForm>

          <TextInput source="name" validate={ required } />

          <ImageInput source="logo" label="Logo" accept="image/*">
            <ImageField source="src"/>
          </ImageInput>

          <LongTextInput source="description"
            options={{
              fullWidth:true,
            }}/>

          <ArrayInput source="links" label="Links" labelAdd="Add Link">
              <TextInput source="name" label="Name" options={{ fullWidth: true }} style={{display:'inline-block', width:'23%', paddingRight: '2%' }}/>
              <TextInput source="url" label="Url" options={{ fullWidth: true }}  style={{display:'inline-block', width:'60%', }}/>
          </ArrayInput>

          <ArrayInput source="mediaObjs" label="Media" labelAdd="Add Media">
            <TextInput source="url" label="Url" options={{ fullWidth: true }} style={{display:'inline-block', width: '85%' }}/>
          </ArrayInput>

        </SimpleForm>
    </Edit>
  );
};
