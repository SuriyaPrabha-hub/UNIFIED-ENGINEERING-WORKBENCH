#pragma once
#include <vector>
#include <string>
#include "json.hpp"

namespace workbench {

struct NeuralNetParams {
    double w = 0.5; // Input-to-hidden weight
    double b = 0.0; // Hidden bias
    double v = 1.0; // Hidden-to-output weight
    double c = 0.0; // Output bias
};

struct Gradients {
    double dJ_dw = 0.0;
    double dJ_db = 0.0;
    double dJ_dv = 0.0;
    double dJ_dc = 0.0;
};

struct ForwardPassResult {
    double x = 1.0;
    double target_y = 2.0;
    double z = 0.0;        // z = w*x + b
    double h = 0.0;        // h = tanh(z)
    double y_hat = 0.0;    // y_hat = v*h + c
    double loss_J = 0.0;   // J = 0.5 * (y_hat - y)^2
};

struct GradientCheckResult {
    std::string param_name;
    double analytical_grad;
    double numerical_grad;
    double abs_error;
    bool passed; // abs_error <= 1e-5
};

struct TrainingStepRecord {
    int step;
    double loss_J;
    double y_hat;
    NeuralNetParams params;
    Gradients grads;
};

struct BackpropSimulationResult {
    NeuralNetParams initial_params;
    ForwardPassResult initial_forward;
    Gradients initial_analytical_grads;
    std::vector<GradientCheckResult> gradient_checks;
    bool all_grad_checks_passed;
    
    // Step 1 updated parameters
    NeuralNetParams step1_updated_params;
    
    // 100 subsequent training steps
    std::vector<TrainingStepRecord> history;
    double final_loss;
    double final_prediction;
    
    std::string mathematical_derivation_explanation;

    nlohmann::json toJson() const;
    std::string toCsv() const;
};

class NeuralNetEngine {
public:
    static ForwardPassResult forward(double x, double target_y, const NeuralNetParams& p);
    
    // Computes analytical gradients using manual chain rule
    static Gradients computeGradients(const ForwardPassResult& fp, const NeuralNetParams& p);

    // Computes numerical gradient via central finite difference: (J(theta+eps) - J(theta-eps)) / (2*eps)
    static double computeNumericalGradient(double x, double target_y, NeuralNetParams p, const std::string& param_name, double epsilon = 1.0e-6);

    // Runs complete verification and 100 training steps
    static BackpropSimulationResult runSimulation(double lr = 0.1, int num_steps = 100);
};

} // namespace workbench
