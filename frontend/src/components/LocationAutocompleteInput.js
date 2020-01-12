import * as React from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { TextInput, Card, TouchableRipple } from 'react-native-paper';

export default class LocationAutocompleteInput extends React.Component {
  constructor(props) {
    super(props);

    //generate session code for google maps API
    var code = Math.random()
      .toString(10)
      .substring(2, 7);

    this.state = {
      text: '',
      isAutofilled: false,
      session: code,
      suggestions: [],
    };
  }

  //fetch suggestions
  getSuggestions(string) {
    var url =
      'https://maps.googleapis.com/maps/api/place/autocomplete/json?input=' +
      string +
      '&key=REDACTED&sessiontoken=' +
      this.state.session;

    fetch(url)
      .then(response => response.json())
      .then(responseJson => {
        this.setState({ suggestions: responseJson.predictions });
      })
      .catch(error => {
        console.error(error);
      });
  }

  render() {
    return (
      <View style={[styles.container, this.props.style]}>
        <TextInput
          style={{ width: '100%' }}
          label={this.props.label}
          value={this.state.text}
          error={this.props.error}
          numberOfLines={1}
          multiline={false}
          dense={true}
          theme={{ colors: { primary: "#ff8700" } }}
          mode={this.props.mode}

          //clear text input when focused
          onFocus={() => { this.setState({ text: '', isAutofilled: false }) }}

          //generate suggestions when new character is typed
          onChangeText={text => {
            if (text.length > 1) {
              this.getSuggestions(text.trim().replace(/ /g, '+'));
            }
            this.setState({ text: text, isAutofilled: false });
          }}

          //when text input is blurred remove suggestions and clear if not autofilled
          onBlur={() => {
            var text = this.state.text;
            if (!this.state.isAutofilled) {
              text = '';
              //if no suggestion chosen pass null to submit
              this.props.onEnter(null);
            }
            this.setState({ text: text, suggestions: [] });
          }}

        />
        {this.state.suggestions.length > 0 && (
          <Card style={styles.autocomplete}>
            {this.state.suggestions.map(suggestion => {
              return (
                <TouchableRipple
                  //when suggestion is chosen remove all suggestions
                  onPress={() => {
                    this.setState({
                      text: suggestion.description,
                      suggestions: [],
                      isAutofilled: true,
                    });

                    //load geo coords for chosen suggestion
                    var url =
                      'https://maps.googleapis.com/maps/api/place/details/json?place_id=' +
                      suggestion.place_id +
                      '&fields=geometry,name&key=REDACTED&sessiontoken=' +
                      this.state.session;

                    fetch(url)
                      .then(response => response.json())
                      .then(responseJson => {
                        //pass place details to parent
                        var loc = responseJson.result.geometry.location;
                        loc.description = suggestion.description;
                        loc.name = responseJson.result.name;
                        this.props.onEnter(loc);
                      })
                      .catch(error => {
                        console.error(error);
                        //if error send null to parent
                        this.props.onEnter(null);
                      });
                  }}
                  rippleColor="rgba(0, 0, 0, .32)">
                  <Text style={styles.suggestion}>
                    {suggestion.description}
                  </Text>
                </TouchableRipple>
              );
            })}
          </Card>
        )}
      </View>
    );
  }
}

//Styles for only this page DOES NOT NEED EXTERNAL STYLE SHEET
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
  },
  autocomplete: {
    width: '100%',
    elevation: 3,
    position: 'absolute',
    top: 48,
    padding: 5,
  },
  suggestion: {
    padding: 5,
    paddingStart: 10,
  },
});
