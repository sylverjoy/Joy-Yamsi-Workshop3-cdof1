from flask import Flask, request, jsonify
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn import datasets
from sklearn.metrics import accuracy_score
import numpy as np

import json

# Load Iris dataset
iris = datasets.load_iris()
X, y = iris.data, iris.target

# Split the dataset into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train Support Vector Machine model
svm_model = SVC()
svm_model.fit(X_train, y_train)

# Train Decision Tree model 
decision_tree_model = DecisionTreeClassifier()
decision_tree_model.fit(X_train, y_train)

# Mapping of class labels to flower names
class_names = {0: 'Setosa', 1: 'Versicolor', 2: 'Virginica'}

def get_features(req):
    sepal_length = req.args.get('sepal_length', type=float)
    sepal_width = req.args.get('sepal_width', type=float)
    petal_length = req.args.get('petal_length', type=float)
    petal_width = req.args.get('petal_width', type=float) 
    features = [sepal_length, sepal_width, petal_length, petal_width]

    return features

# Initialize Flask app
app = Flask(__name__)

# API route for Support Vector Machine model
@app.route('/predict_svm', methods=['GET'])
def predict_svm():
    features = get_features(request)
    prediction = svm_model.predict([features])[0]
    return jsonify({'prediction': class_names[int(prediction)]})

# API route for Decision Tree model 
@app.route('/predict_decision_tree', methods=['GET'])
def predict_decision_tree():
    features = get_features(request)
    prediction = decision_tree_model.predict([features])[0]
    return jsonify({'prediction': class_names[int(prediction)]})


# API route for Consensus Prediction Since I'm using two models
@app.route('/predict', methods=['GET'])
def consensus_predict():
    features = get_features(request)
    dt_prediction = decision_tree_model.predict([features])[0]
    svm_prediction = svm_model.predict([features])[0]
    consensus_prediction = int(np.mean([dt_prediction, svm_prediction]))
    return jsonify({'consensus_prediction': class_names[int(consensus_prediction)]})

if __name__ == '__main__':
    app.run(debug=True)


