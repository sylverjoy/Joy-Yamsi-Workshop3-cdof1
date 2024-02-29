from flask import Flask, request, jsonify
import numpy as np

# Mapping of class labels to flower names
class_names = {0: 'Setosa', 1: 'Versicolor', 2: 'Virginica'}

# Function to get feature values from post args
def get_features(req):
    sepal_length = req.args.get('sepal_length', type=float)
    sepal_width = req.args.get('sepal_width', type=float)
    petal_length = req.args.get('petal_length', type=float)
    petal_width = req.args.get('petal_width', type=float) 
    features = [sepal_length, sepal_width, petal_length, petal_width]

    return features

# Initialize Flask app
app = Flask(__name__)

# External models API URLs (replace with the actual ngrok URLs of the external models) - changes each time launched.
external_model_url1 = "https://external-model-ngrok-url.ngrok.io/predict"
external_model_url2 = "https://external-model-ngrok-url.ngrok.io/predict"


def get_external_model_prediction(url,req,features):
    # Make a request to the external model API
    response = req.get(f"{url}?sepal_length={features[0]}&sepal_width={features[1]}&petal_length={features[2]}&petal_width={features[3]}")
    
    return response.json()

# API route for Consensus Prediction with external model weighted
@app.route('/consensus_predict', methods=['GET'])
def consensus_predict_with_ext():
    features = get_features(request)
    
    # Get prediction from the external models
    external_model1_prediction = get_external_model_prediction(external_model_url1,request,features)['prediction_int']
    external_model2_prediction = get_external_model_prediction(external_model_url2,request,features)['prediction_int']  

    # Compute weights based on prediction accuracies
    total_prob = external_model1_prediction['accuracy'] + external_model2_prediction['accuracy']
    
    external_model1_weight = external_model1_prediction['accuracy'] / total_prob
    external_model2_weight = external_model2_prediction['accuracy'] / total_prob
    
    # Combine predictions using averaging
    consensus_prediction_with_ext = int(np.mean([external_model1_prediction * external_model1_weight, external_model2_prediction * external_model2_weight]))
    
    return jsonify({'consensus_prediction_with_ext': class_names[int(consensus_prediction_with_ext)], 'consensus_predict_with_ext_int': int(consensus_prediction_with_ext) })

if __name__ == '__main__':

    app.run(debug=True)


