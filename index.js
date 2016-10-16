'use strict';

var EventEmitter = require( 'eventemitter2' ).EventEmitter2;
var extend = require( 'extend' );

module.exports = BrowserEventBus;

function BrowserEventBus( options ) {
    var self = this;
    EventEmitter.call( self );
    
    self._options = extend( {
        namespace: '',
        target: '*',
        origin: '*'
    }, options );
    
    window.addEventListener( 'message', self._onMessage.bind( self ), false );
}

BrowserEventBus.supported = ( 'postMessage' in window ) && ( 'bind' in function(){} ) && ( 'JSON' in window );

BrowserEventBus.prototype = Object.create( EventEmitter.prototype, {} );

BrowserEventBus.prototype._emit = BrowserEventBus.prototype.emit;

BrowserEventBus.prototype.emit = function() {
    var self = this;
    
    var args = Array.prototype.slice.call( arguments, 0 );
    var event = ( self._options.namespace ? self._options.namespace + ':' : '' ) + JSON.stringify( args );

    // get all our contained frames
    var targets = Array.prototype.slice.call( window.frames, 0 );
    
    // walk up any iframe tree
    var win = ( window === window.parent ) ? null : window.parent;
    while( win ) {
        targets.push( win );
        win = ( win === win.parent ) ? null : win.parent;
    }

    targets.forEach( function( target ) {
        if ( target !== window ) {
            target.postMessage( event, self._options.target );
        }
    } );
};

BrowserEventBus.prototype._onMessage = function( event ) {
    var self = this;
    
    if ( self._options.namespace && event.data.indexOf( self._options.namespace ) !== 0 ) {
        return;
    }

    if ( self._options.origin !== '*' && event.origin !== self._options.origin ) {
        return;
    }
    
    var json = event.data.slice( self._options.namespace ? self._options.namespace.length + 1 : 0 );
    var msg = null;
    
    try {
        msg = JSON.parse( json );
    }
    catch( ex ) {
        msg = null;
        self._emit( 'error', 'browser-event-bus: ' + ex );
        return;
    }
    
    if ( !Array.isArray( msg ) ) {
        self._emit( 'error', new Error( 'browser-event-bus: Did not get an array from event: ' + event.data ) );
        return;
    }

    msg.push( event );
    
    self._emit.apply( self, msg );
};