/** @jsx React.DOM */
var HelloMessage = React.createClass({
  render: function() {
    return <div>Hello {this.props.name}</div>;
  }
});
console.log('here');
React.renderComponent(<HelloMessage name="John" />, document.querySelector('body'));
