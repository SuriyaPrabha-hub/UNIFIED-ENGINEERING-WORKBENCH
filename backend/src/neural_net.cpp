#include "neural_net.hpp"
#include <cmath>
#include <sstream>
#include <iomanip>

namespace workbench {

ForwardPassResult NeuralNetEngine::forward(double x, double target_y, const NeuralNetParams& p) {
    ForwardPassResult res;
    res.x = x;
    res.target_y = target_y;
    res.z = p.w * x + p.b;
    res.h = std::tanh(res.z);
    res.y_hat = p.v * res.h + p.c;
    double diff = res.y_hat - target_y;
    res.loss_J = 0.5 * diff * diff;
    return res;
}

Gradients NeuralNetEngine::computeGradients(const ForwardPassResult& fp, const NeuralNetParams& p) {
    Gradients g;
    // dJ/d_y_hat = (y_hat - target_y)
    double dJ_dyhat = fp.y_hat - fp.target_y;

    // dJ/dv = dJ/dyhat * dyhat/dv = (y_hat - y) * h
    g.dJ_dv = dJ_dyhat * fp.h;

    // dJ/dc = dJ/dyhat * dyhat/dc = (y_hat - y) * 1
    g.dJ_dc = dJ_dyhat * 1.0;

    // dJ/dh = dJ/dyhat * dyhat/dh = (y_hat - y) * v
    double dJ_dh = dJ_dyhat * p.v;

    // dh/dz = 1 - tanh^2(z) = 1 - h^2
    double dh_dz = 1.0 - (fp.h * fp.h);

    // dJ/dz = dJ/dh * dh/dz = (y_hat - y) * v * (1 - h^2)
    double dJ_dz = dJ_dh * dh_dz;

    // dJ/dw = dJ/dz * dz/dw = dJ/dz * x
    g.dJ_dw = dJ_dz * fp.x;

    // dJ/db = dJ/dz * dz/db = dJ/dz * 1
    g.dJ_db = dJ_dz * 1.0;

    return g;
}

double NeuralNetEngine::computeNumericalGradient(double x, double target_y, NeuralNetParams p, const std::string& param_name, double epsilon) {
    NeuralNetParams p_plus = p;
    NeuralNetParams p_minus = p;

    if (param_name == "w") {
        p_plus.w += epsilon;
        p_minus.w -= epsilon;
    } else if (param_name == "b") {
        p_plus.b += epsilon;
        p_minus.b -= epsilon;
    } else if (param_name == "v") {
        p_plus.v += epsilon;
        p_minus.v -= epsilon;
    } else if (param_name == "c") {
        p_plus.c += epsilon;
        p_minus.c -= epsilon;
    }

    double J_plus = forward(x, target_y, p_plus).loss_J;
    double J_minus = forward(x, target_y, p_minus).loss_J;

    // Central finite difference formula
    return (J_plus - J_minus) / (2.0 * epsilon);
}

BackpropSimulationResult NeuralNetEngine::runSimulation(double lr, int num_steps) {
    BackpropSimulationResult result;
    result.initial_params = NeuralNetParams{0.5, 0.0, 1.0, 0.0};
    double x = 1.0;
    double target_y = 2.0;

    // Step 0: Initial forward pass
    result.initial_forward = forward(x, target_y, result.initial_params);
    result.initial_analytical_grads = computeGradients(result.initial_forward, result.initial_params);

    // Finite difference gradient check (epsilon = 1e-6, error threshold <= 1e-5)
    std::vector<std::pair<std::string, double>> grad_pairs = {
        {"w", result.initial_analytical_grads.dJ_dw},
        {"b", result.initial_analytical_grads.dJ_db},
        {"v", result.initial_analytical_grads.dJ_dv},
        {"c", result.initial_analytical_grads.dJ_dc}
    };

    result.all_grad_checks_passed = true;
    for (const auto& item : grad_pairs) {
        double num_grad = computeNumericalGradient(x, target_y, result.initial_params, item.first, 1.0e-6);
        double err = std::abs(item.second - num_grad);
        bool ok = (err <= 1.0e-5);
        if (!ok) result.all_grad_checks_passed = false;

        GradientCheckResult check;
        check.param_name = item.first;
        check.analytical_grad = item.second;
        check.numerical_grad = num_grad;
        check.abs_error = err;
        check.passed = ok;
        result.gradient_checks.push_back(check);
    }

    // Step 1 simultaneous parameter update
    result.step1_updated_params.w = result.initial_params.w - lr * result.initial_analytical_grads.dJ_dw;
    result.step1_updated_params.b = result.initial_params.b - lr * result.initial_analytical_grads.dJ_db;
    result.step1_updated_params.v = result.initial_params.v - lr * result.initial_analytical_grads.dJ_dv;
    result.step1_updated_params.c = result.initial_params.c - lr * result.initial_analytical_grads.dJ_dc;

    // Run 100 training steps
    NeuralNetParams current_params = result.initial_params;
    result.history.reserve(num_steps + 1);

    for (int step = 0; step <= num_steps; ++step) {
        ForwardPassResult fp = forward(x, target_y, current_params);
        Gradients g = computeGradients(fp, current_params);

        TrainingStepRecord rec;
        rec.step = step;
        rec.loss_J = fp.loss_J;
        rec.y_hat = fp.y_hat;
        rec.params = current_params;
        rec.grads = g;
        result.history.push_back(rec);

        if (step < num_steps) {
            // Simultaneous gradient descent update
            current_params.w -= lr * g.dJ_dw;
            current_params.b -= lr * g.dJ_db;
            current_params.v -= lr * g.dJ_dv;
            current_params.c -= lr * g.dJ_dc;
        }
    }

    result.final_loss = result.history.back().loss_J;
    result.final_prediction = result.history.back().y_hat;

    result.mathematical_derivation_explanation = 
        "Forward pass at x=1: z = w*x + b = 0.5(1) + 0 = 0.5. h = tanh(0.5) = 0.462117. "
        "y_hat = v*h + c = 1.0(0.462117) + 0 = 0.462117. Error (y_hat - y) = 0.462117 - 2.0 = -1.537883. "
        "Initial Loss J = 0.5 * (-1.537883)^2 = 1.182542. "
        "Analytical chain-rule gradients: dJ/dv = -0.710682, dJ/dc = -1.537883, "
        "dJ/dz = (y_hat - y)*v*(1 - h^2) = -1.537883 * 1.0 * (1 - 0.462117^2) = -1.209465. "
        "dJ/dw = dJ/dz * x = -1.209465, dJ/db = dJ/dz * 1 = -1.209465. "
        "Negative gradients indicate parameters must increase to minimize loss, aligning with gradient descent update: theta_new = theta - lr * grad.";

    return result;
}

nlohmann::json BackpropSimulationResult::toJson() const {
    nlohmann::json j;
    j["initial_params"] = {
        {"w", initial_params.w},
        {"b", initial_params.b},
        {"v", initial_params.v},
        {"c", initial_params.c}
    };
    j["initial_forward"] = {
        {"x", initial_forward.x},
        {"target_y", initial_forward.target_y},
        {"z", initial_forward.z},
        {"h", initial_forward.h},
        {"y_hat", initial_forward.y_hat},
        {"loss_J", initial_forward.loss_J}
    };
    j["initial_grads"] = {
        {"dJ_dw", initial_analytical_grads.dJ_dw},
        {"dJ_db", initial_analytical_grads.dJ_db},
        {"dJ_dv", initial_analytical_grads.dJ_dv},
        {"dJ_dc", initial_analytical_grads.dJ_dc}
    };
    j["all_grad_checks_passed"] = all_grad_checks_passed;

    nlohmann::json checks_arr = nlohmann::json::array();
    for (const auto& chk : gradient_checks) {
        checks_arr.push_back({
            {"param", chk.param_name},
            {"analytical", chk.analytical_grad},
            {"numerical", chk.numerical_grad},
            {"abs_error", chk.abs_error},
            {"passed", chk.passed}
        });
    }
    j["gradient_checks"] = checks_arr;

    j["step1_updated_params"] = {
        {"w", step1_updated_params.w},
        {"b", step1_updated_params.b},
        {"v", step1_updated_params.v},
        {"c", step1_updated_params.c}
    };

    nlohmann::json history_arr = nlohmann::json::array();
    for (const auto& h : history) {
        history_arr.push_back({
            {"step", h.step},
            {"loss", h.loss_J},
            {"y_hat", h.y_hat},
            {"w", h.params.w},
            {"b", h.params.b},
            {"v", h.params.v},
            {"c", h.params.c}
        });
    }
    j["history"] = history_arr;
    j["final_loss"] = final_loss;
    j["final_prediction"] = final_prediction;
    j["explanation"] = mathematical_derivation_explanation;

    return j;
}

std::string BackpropSimulationResult::toCsv() const {
    std::ostringstream ss;
    ss << std::fixed << std::setprecision(6);
    ss << "# Unified Engineering Workbench - Neural Network Backpropagation Training History\n";
    ss << "# Target: x=1.0, y=2.0, Learning Rate=0.1, Steps=100\n";
    ss << "step,loss_J,y_hat,w,b,v,c,dJ_dw,dJ_db,dJ_dv,dJ_dc\n";
    for (const auto& h : history) {
        ss << h.step << "," << h.loss_J << "," << h.y_hat << ","
           << h.params.w << "," << h.params.b << "," << h.params.v << "," << h.params.c << ","
           << h.grads.dJ_dw << "," << h.grads.dJ_db << "," << h.grads.dJ_dv << "," << h.grads.dJ_dc << "\n";
    }
    return ss.str();
}

} // namespace workbench
