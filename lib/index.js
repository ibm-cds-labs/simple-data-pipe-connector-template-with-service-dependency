//-------------------------------------------------------------------------------
// Copyright IBM Corp. 2015
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//-------------------------------------------------------------------------------

'use strict';

var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var request = require('request');

var pipesSDK = require('simple-data-pipe-sdk');
var connectorExt = pipesSDK.connectorExt;
var bluemixHelperConfig = require('bluemix-helper-config');
var configManager = bluemixHelperConfig.configManager;
var vcapServices = bluemixHelperConfig.vcapServices;

/**
 * Sample connector that stores a few JSON records in Cloudant
 * Build your own connector by following the TODO instructions
 */
function sampleConnector2( parentDirPath ){

	 /* 
	  * Customization is mandatory
	  */

	// TODO: 
	//   Replace 'template' with a unique connector id (Should match the value of property "simple_data_pipe"."name" in package.json)	
	//   Replace 'Sample Data Source' with the desired display name of the data source (e.g. reddit) from which data will be loaded
	var connectorInfo = {
						  id: 'template_with_service',			// internal connector ID 
						  name: 'Another Sample Data Source'	// connector display name
						};

	// TODO						
	var connectorOptions = {
					  		recreateTargetDb: true, // if set (default: false) all data currently stored in the staging database is removed prior to data load
					  		useCustomTables: true   // keep true (default: false)
						   };						

	// Call constructor from super class; 
	connectorExt.call(this, 
					 connectorInfo.id, 			
					 connectorInfo.name, 
					 connectorOptions	  
					 );	

	/*
	 * Obtain handles to prerequisite Bluemix service(s) that will be utilized by this connector.
	 * 
	 * Note: If a connector declares its service dependencies in its package.json file, as it was done in this sample connector, 
	 * the Simple Data Pipe framework validates upon startup that the listed services are bound to the application. The connector
	 * is only loaded if the stated prerequisites are met.
	 * 
     * This sample connector invokes the Watson Tone Analyzer service and therefore declares the following dependency in package.json:
     *
	 *  "service_dependencies": [
	 *					          {
	 *					             "service_name": "tone analyzer",
	 *					         	 "service_plan": "beta",
	 *						         "instance_name": "tone analyzer",
	 *                               "vcap_env_service_alias" : "WATSON_TONE_ANALYZER" 
	 *						       }
     * 							]
     * 
     *  service_name (required): the formal Bluemix service name, as displayed by `cf services`
     *  service_plan (required): the formal Bluemix service plan name, as displayed by `cf services`
     *  instance_name (required): the name of the service instance this connector will try to load; 
     *  vcap_env_service_alias (optional): if defined, identifies the name of a user-defined environment variable, that, if set,
     *                                     must contain the name of the service instance this connector is supposed to use
     * 
     */ 
	// This sample connector leverages the Watson Tone Analyzer service and expects its instance name to contain either the string
	// 'tone analyzer' or the value of user-defined variable WATSON_TONE_ANALYZER. If variable WATSON_TONE_ANALYZER is set to
	// 'analyze me', vcapServices.getService will try to load the service credentials for a service with that name.
	// vcapServices.getService returns null if no service instance matching the sepcified string is bound to the Simple Data Pipe
	// application
	var watsonToneAnalyzerService = vcapServices.getService( configManager.get('WATSON_TONE_ANALYZER') || 'tone analyzer' );

	/*
	 * Customization is mandatory!
	 * @return list of data sets (also referred to as tables for legacy reasons) from which the user can choose from
	 */
	this.getTables = function(){

		var dataSets = [];

		// TODO: 'Define' the data set or data sets that can be loaded from the data source. The user gets to choose one.
		// dataSets.push({name:'dataSetName', labelPlural:'dataSetName'}); // assign the name to each property

		/* 
		 * In this example the data source contains several static data sets - transcripts of the victory speeches of 
		 * the Republican and Democratic 2016 presidential candidates.
		 */

	 	// set data set location
	 	var sampleDataDir = path.join(__dirname,'..','sample_data' + path.sep);

	 	// load data set metadata file
	 	var transciptListings;
	 	try {
				transciptListings = require(sampleDataDir + 'transcriptListings.json'); 		 		
	 	}
	 	catch(e) {
	 		// only triggered by a code logic or packaging error; return empty data set list
	 		return dataSets;
	 	}

	 	// retrieve listings and verify that a transcript file is available
 		var fileStat;
		_.forEach(transciptListings, 
		 		  function (listing) { 							 	
		 		  						// verify that the transcript file exists
										fileStat = fs.statSync(sampleDataDir + listing.transcript);
										if (fileStat && !fileStat.isDirectory()) {
											    dataSets.push(
											    				{
											    					name: listing.transcript_id, 
											    					labelPlural:listing.transcript_id
											    				});	    	
										 }
	 			  }
	 	);

		// Sometimes you might want to provide the user with the option to load all data sets concurrently
		// To enable that feature, define a single data set that contains only property 'labelPlural' 
		dataSets.push({labelPlural:'All victory speeches'});

		// In the UI the user gets to choose from: 
		//  -> All data sets
		//  -> sample data set 1
		//  -> ...

		// sort list; if present, the ALL_DATA option should be displayed first
		return dataSets.sort(function (dataSet1, dataSet2) {
																if(! dataSet1.name)	{ // ALL_DATA (only property labelPlural is defined)
																	return -1;
																}

																if(! dataSet2.name) {// ALL_DATA (only property labelPlural is defined)
																	return 1;
																}

																return dataSet1.name - dataSet2.name;
															   });

	}; // getTables

	/*
	 * Customization is not needed.
	 */
	this.getTablePrefix = function(){
		// The prefix is used to generate names for the Cloudant staging databases that hold your data. The recommended
		// value is the connector ID to assure uniqueness.
		return connectorInfo.id;
	};
	
	/*
	 * Customization is mandatory!
	 * Implement the code logic to fetch data from the source, optionally enrich it and store it in Cloudant.
	 * @param dataSet - dataSet.name contains the data set name that was (directly or indirectly) selected by the user
	 * @param done(err) - callback funtion to be invoked after processing is complete
	 * @param pipe - data pipe configuration
	 * @param logger - a dedicated logger instance that is only available during data pipe runs
	 */
	this.fetchRecords = function( dataSet, pushRecordFn, done, pipeRunStep, pipeRunStats, logger, pipe, pipeRunner ){

		// The data set is typically selected by the user in the "Filter Data" panel during the pipe configuration step
		// dataSet: {name: 'data set name'}. However, if you enabled the ALL option (see get Tables) and it was selected, 
		// the fetchRecords function is invoked asynchronously once for each data set.

		// Bunyan logging - https://github.com/trentm/node-bunyan
		// The log file is attached to the pipe run document, which is stored in the Cloudant repository database named pipes_db.
		// To enable debug logging, set environment variable DEBUG to '*'' or 'to sdp-pipe-run' (withoiut the quotes).
		logger.debug('Fetching data set ' + dataSet.name + ' from cloud data source.');

		// TODO: fetch data from cloud data source
		// in this sample the data source contains static data sets that are loaded from local files

		// set data set location
	 	var sampleDataDir = path.join(__dirname, '..', 'sample_data' + path.sep);


	 	// load listings and lookup metadata
		var transciptListings = require(sampleDataDir + 'transcriptListings.json'); 
		var listing = _.find(transciptListings, function(listing){
									return (dataSet.name === listing.transcript_id);
					  		});

		if(!listing) {
			// Invoke done callback function to terminate execution and pass an error message
			logger.error('The data set cannot be found.');
			return done('The data set cannot be found.');
		}

		fs.readFile(sampleDataDir + listing.transcript, function(err, data) {
			if(err) {
				logger.error('The data set could not be loaded: ' + err);
				// Invoke done callback function to terminate execution and pass an error message
				return done('The data set could not be loaded: ' + err);
			}

			var record = {
							winner: listing.winner,
							party: listing.party,
							location: listing.location,		
							transcript: data.toString()
						 };


			// analyze the speech using Watson Tone Analzyer service 
			request.post( watsonToneAnalyzerService.credentials.url + '/v3/tone?version=2016-02-11',
			             {
						  'auth': {
					 	           'user': watsonToneAnalyzerService.credentials.username,
						           'pass': watsonToneAnalyzerService.credentials.password,
						           'sendImmediately': true
						          },
						  'json': {
						    	   'text': record.transcript
						          }
					     }, 
					     function( err, response, body ){
							var msg = '';

							if ( err ){
								// Invoke done callback function to terminate execution and pass an error message
								msg = 'Error querying Watson Tone Analyzer service: ' + err;
								logger.error(msg);
								return done( msg );
							}

							if(response.statusCode >= 300) {
								// Invoke done callback function to terminate execution and pass an error message
								msg = 'Call to Watson Tone Analyzer URL ' + response.request.uri.href + ' returned status ' + response.statusCode + ' (' + response.body.error + ')';
								logger.error(msg);
								return done(msg);
							}

							// if a result was returned, attach it to the transcript
							if(body.document_tone) {

	                        	/*
	                        	Tone Analyzer API v3 output (http://www.ibm.com/smarterplanet/us/en/ibmwatson/developercloud/tone-analyzer/api/v3/)
								
								{ 
								    document_tone: {
		
													tone_categories: [ 
																	  	{ 
																	  	  tones: [ [Object], [Object], [Object], [Object], [Object] ], 
																	  	  category_id: 'emotion_tone', 
																	      category_name: 'Emotion Tone' 
																	    }, 
																	    { 
																	      tones: [ [Object], [Object], [Object] ], 
																	      category_id: 'writing_tone', 
																	      category_name: 'Writing Tone' 
																	    }, 
																	    { 
																	      tones: [ [Object], [Object], [Object], [Object], [Object] ], 
																	      category_id: 'social_tone', 
																	      category_name: 'Social Tone' 
																	    } 
																      ]
											        },
								    sentences_tone: ...
								}			     
	                        	*/

								_.forEach(body.document_tone.tone_categories, function(tone_category) {
									_.forEach(tone_category.tones, function(tone){
										// Sample tone definition: { score: 0.10796, tone_id: 'anger', tone_name: 'Anger' }
										record[tone.tone_name.replace(/ /g,'_')] = (parseFloat(tone.score * 100)).toFixed(2);
									});
								});

							} // if(body.document_tone)

							/* 
							   TODO: The results of a data pipe run are persisted in Cloudant by invoking pushRecordFn, passing a single record
							         {...} or multiple records [{...}].
							         One Cloudant database is created for each data set and named using the following algorithm:
							         getTablePrefix() + dataSet.name. 
							         The total number of records is automatically calculated if this function is invoked multiple times.
							*/

							// 
							// Parameter: pass a single record or a set of records to be persisted
							//             
							pushRecordFn(record);

							// Invoke done callback function after data processing is complete.
							// if a string is passed to the function, it is assumed that this indicates an error 
							//  and processing is aborted by the framework
							return done();	

					} // function( err, response, body )
			); // post

		});
	}; // fetchRecords
}

//Extend event Emitter
require('util').inherits(sampleConnector2, connectorExt);

module.exports = new sampleConnector2();