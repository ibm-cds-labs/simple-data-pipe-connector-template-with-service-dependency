> Hey there! So you want to build your own Simple Data Pipe connector? [Start here](https://github.com/ibm-cds-labs/simple-data-pipe-connector-template/wiki/How-to-build-a-Simple-Data-Pipe-connector-using-this-template).

***


# Simple Data Pipe &lt;TEMPLATE&gt; Connector 

This [Simple Data Pipe](https://developer.ibm.com/clouddataservices/simple-data-pipe/) connector template illustrates how to 
* load a static set of data sets (2016 election speeches),
* use a Bluemix service to perform tone analysis, and 
* store the results in Cloudant.

### Pre-requisites

##### General 
 Review the pre-requisites listed below.

##### Deploy the Simple Data Pipe

 [Deploy the Simple Data Pipe in Bluemix](https://github.com/ibm-cds-labs/simple-data-pipe) using the Deploy to Bluemix button or manually.

##### Services

This connector requires the [Watson Tone Analyzer service](https://console.ng.bluemix.net/catalog/services/tone-analyzer) in IBM Bluemix to be bound to the Simple Data Pipe application. 

[Provision and bind](https://github.com/ibm-cds-labs/simple-data-pipe/wiki/Provision-and-bind-a-service-instance-in-Bluemix) a _Watson Tone Analyzer service_ instance. If you're using the Cloud Foundry command line interface, do so by running the following commands:

````
  $ cf create-service tone_analyzer beta "tone analyzer"
  $ cf bind-service simple-data-pipe "tone analyzer"
  $ cf restage simple-data-pipe
````

> Pro Tip: If you want to re-use an existing instance that is not named `tone analyzer`, create a [USER-DEFINED Environment Variable](https://www.ng.bluemix.net/docs/manageapps/depapps.html#ud_env) in the Simple Data Pipe application named __WATSON_TONE_ANALYZER__ and set its value to the name of the existing Tone Analyzer service. [Read how](https://github.com/ibm-cds-labs/simple-data-pipe/wiki/Create-a-user-defined-environment-variable-in-Bluemix).

##### Install the &lt;TEMPLATE&gt; connector

  When you [follow these steps to install this connector](https://github.com/ibm-cds-labs/simple-data-pipe/wiki/Installing-a-Simple-Data-Pipe-Connector), add the following line to the dependencies list in the package.json file: `"simple-data-pipe-connector-template-with-service-dependency": "https://github.com/ibm-cds-labs/simple-data-pipe-connector-template-with-service-dependency.git"`

##### Enable OAuth support and collect connectivity information
This sample connector does not connect to a cloud data source and therefore does not require oAuth authentication checking.

### Using the &lt;TEMPLATE&gt; Connector 

To configure and run a pipe

1. Open the Simple Data Pipe web console.
2. Select __Create A New Pipe__.
3. Select __Another Sample Data Source__ for the __Type__ when creating a new pipe  
4. In the _Connect_ page, enter any string as _consumer key_ and _consumer secret_. 
5. Select the data set (or data sets) to be loaded.
6. Schedule or run the data pipe now.

#### License 

Copyright [2016] IBM Cloud Data Services

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

