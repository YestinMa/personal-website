---
title: "时间序列分析 CHEATSHEET"
slug: "时间序列分析-cheatsheet"
date: "2025-09-01"
lastEditedTime: "2026-09-27T08:50:03.303Z"
renderVersion: "6"
category: "study"
tags: ["study","notes"]
status: "Published"
notionPageId: "3a2db726-82a8-816e-9340-e41e18511485"
---
## Lecture 1 平稳性与 ARMA 模型
### 1.1 时间序列与基本模型
时间序列是一组按照时间索引排列的随机变量。若时间指标集合为 \(\mathcal{T}=\{0,1,2,\ldots,T\}\)，则时间序列记为 \(\{X_t:t\in\mathcal{T}\}\)。其关键特征是观测值之间通常存在动态依赖。
### 1.2 白噪声
白噪声是最简单的平稳过程。若 \(\{\varepsilon_t\}\sim WN(0,\sigma_\varepsilon^2)\)，则 \(\mathbb{E}(\varepsilon_t)=0\)、\(\operatorname{Var}(\varepsilon_t)=\sigma_\varepsilon^2\)，并且当 \(t\neq s\) 时有 \(\operatorname{Cov}(\varepsilon_t,\varepsilon_s)=0\)。
白噪声不要求独立。如果进一步假设各期扰动独立同分布，则通常记为独立白噪声。
### 1.3 自回归模型
一阶自回归模型 AR(1) 为 \(X_t=\mu+\phi X_{t-1}+\varepsilon_t\)。用上一期的观测解释当前值。当 \(|\phi|<1\) 时，冲击的影响会逐期衰减，过程可以保持平稳。
一般的 AR(p) 模型为 \(X_t=\mu+\phi_1X_{t-1}+\phi_2X_{t-2}+\cdots+\phi_pX_{t-p}+\varepsilon_t\)。
### 1.4 移动平均模型
MA(q) 模型用**当前和过去的随机冲击**解释当前值：
\(X_t=\mu+\varepsilon_t+\theta_1\varepsilon_{t-1}+\cdots+\theta_q\varepsilon_{t-q}\)。
### 1.5 ARMA 模型
ARMA(p,q) 同时包含自回归项和移动平均项：
\(X_t=\mu+\sum_{i=1}^{p}\phi_iX_{t-i}+\varepsilon_t+\sum_{j=1}^{q}\theta_j\varepsilon_{t-j}\)。
### 1.6 滞后算子
定义滞后算子 \(LX_t=X_{t-1}\) 和 \(L^kX_t=X_{t-k}\)。进一步定义 AR 多项式 \(\phi(L)=1-\phi_1L-\phi_2L^2-\cdots-\phi_pL^p\)，以及 MA 多项式 \(\theta(L)=1+\theta_1L+\theta_2L^2+\cdots+\theta_qL^q\)。
于是 ARMA(p,q) 可以紧凑地写成 \(\phi(L)X_t=\mu+\theta(L)\varepsilon_t\)。
以 AR(1) 为例，\((1-\phi L)X_t=\mu+\varepsilon_t\)。当 \(|\phi|<1\) 时，
$$
\begin{aligned}
(1-\phi L)^{-1}&=\sum_{k=0}^{\infty}\phi^kL^k,\\
X_t&=\frac{\mu}{1-\phi}+\sum_{k=0}^{\infty}\phi^k\varepsilon_{t-k}.
\end{aligned}
$$
这说明平稳 AR(1) 可以表示为 MA(∞)：当前值是过去所有冲击的加权和，而且权重按照几何速度衰减。
### 1.7 平稳性与相关结构
- 若随机过程满足以下条件，则称其为**协方差平稳**，也称弱平稳：
1. 均值不随时间变化；
2. 方差不随时间变化；
3. 两期之间的协方差只依赖时间间隔，而不依赖具体时点。
形式化地，\(\mathbb{E}(X_t)=\mu_X\)、\(\operatorname{Var}(X_t)=\gamma(0)<\infty\)，并且 \(\operatorname{Cov}(X_t,X_{t-k})=\gamma(k)\)。
- 若对任意时点、任意正整数和任意平移量，随机向量 \((X_t,X_{t+1},\ldots,X_{t+m})\) 与 \((X_{t+h},X_{t+h+1},\ldots,X_{t+h+m})\) 具有相同的联合分布，则称过程严格平稳。
如果二阶矩存在，严格平稳可以推出协方差平稳；反过来一般不成立。高斯过程中，联合分布由均值和协方差完全确定，因此协方差平稳也会带来严格平稳。
### 1.8 自协方差函数与自相关函数
协方差平稳过程的自协方差函数定义为 \(\gamma(k)=\operatorname{Cov}(X_t,X_{t-k})\)，自相关函数 ACF 定义为 \(\rho(k)=\gamma(k)/\gamma(0)\)。它们满足 \(\gamma(k)=\gamma(-k)\)、\(\rho(k)=\rho(-k)\)、\(\rho(0)=1\) 以及 \(|\rho(k)|\leq 1\)。白噪声的相关结构最简单：\(\gamma(0)=\sigma_\varepsilon^2\)，而当 \(k\neq0\) 时 \(\gamma(k)=0\)。因此白噪声没有线性可预测性，但“不相关”仍不等于“独立”。
- 考虑零均值 AR(1)：\(X_t=\phi X_{t-1}+\varepsilon_t\)，其中 \(|\phi|<1\)。利用 MA(∞) 表示，\(X_t=\sum_{j=0}^{\infty}\phi^j\varepsilon_{t-j}\)，可以得到
$$
\begin{aligned}
\gamma(0)
&=\sigma_\varepsilon^2\sum_{j=0}^{\infty}\phi^{2j}
=\frac{\sigma_\varepsilon^2}{1-\phi^2},\\
\gamma(k)&=\phi^{|k|}\gamma(0),\\
\rho(k)&=\phi^{|k|}.
\end{aligned}
$$
所以 AR(1) 的 ACF 不截尾，而是按照几何速度拖尾。当参数为负时，ACF 会正负交替地衰减。
- 对零均值 AR(p) 模型 \(X_t=\sum_{j=1}^{p}\phi_jX_{t-j}+\varepsilon_t\)，两边分别乘以滞后变量并取期望（Yule-Walker方程），可得：
$$
\begin{aligned}
\gamma(0)&=\sum_{j=1}^{p}\phi_j\gamma(j)+\sigma_\varepsilon^2,\\
\gamma(k)&=\sum_{j=1}^{p}\phi_j\gamma(k-j),\qquad k\geq1,\\
\rho(k)&=\sum_{j=1}^{p}\phi_j\rho(k-j),\qquad k\geq1.
\end{aligned}
$$
因此 AR(p) 的 ACF 由一个 p 阶齐次差分方程决定，一般表现为指数衰减或阻尼振荡。
- 对 MA(q) 模型 \(X_t=\sum_{j=0}^{q}\theta_j\varepsilon_{t-j}\)，其自协方差为
$$
\gamma(k)=
\begin{cases}
\sigma_\varepsilon^2\displaystyle\sum_{j=0}^{q-k}\theta_j\theta_{j+k},
&0\leq k\leq q,\\
0,&k>q.
\end{cases}
$$
所以 MA(q) 的 ACF 在 q 阶后截尾。任何有限阶 MA 过程都是协方差平稳的。
- ARMA(p,q) 在前 q 阶的自协方差同时受到 AR 和 MA 参数影响；当 \(k>q\) 时，自协方差满足 AR 部分决定的递推式 \(\gamma(k)=\sum_{j=1}^{p}\phi_j\gamma(k-j)\)。因此：
	- AR(p)：ACF 拖尾，PACF 在 p 阶后截尾；
	- MA(q)：ACF 在 q 阶后截尾，PACF 拖尾；
	- ARMA(p,q)：ACF 与 PACF 通常都拖尾。
- 样本自相关估计为
$$
\widehat{\rho}(k)
=
\frac{
\sum_{t=k+1}^{T}
(X_t-\overline{X})
(X_{t-k}-\overline{X})
}{
\sum_{t=1}^{T}
(X_t-\overline{X})^2
}.
$$
对于白噪声，大样本下单个样本自相关大致落在 \(\pm1.96/\sqrt{T}\) 范围内。这个区间只适合逐阶观察，同时检查多个滞后时还应进行联合检验。
### 1.9 非平稳过程、ARIMA 与长记忆
- **随机游走**
随机游走定义为 \(Y_t=Y_{t-1}+\varepsilon_t\)。反复代入可得 \(Y_t=Y_0+\sum_{j=1}^{t}\varepsilon_j\)，因此 \(\operatorname{Var}(Y_t)=\operatorname{Var}(Y_0)+t\sigma_\varepsilon^2\)。方差随时间增长，所以随机游走不是协方差平稳过程。但一阶差分 \(\Delta Y_t=Y_t-Y_{t-1}=\varepsilon_t\) 是平稳的。
- **ARIMA 模型**
若经过 d 次差分后成为 ARMA(p,q)，则原过程服从 ARIMA(p,d,q)：\(\phi(L)(1-L)^dX_t=\theta(L)\varepsilon_t\)。
- **ARFIMA 与长记忆**
当差分阶数允许为非整数时，得到 ARFIMA 模型。分数差分算子通过二项式展开定义：
$$
(1-L)^d
=1-dL+\frac{d(d-1)}{2!}L^2
-\frac{d(d-1)(d-2)}{3!}L^3+\cdots.
$$
当 \(-\frac{1}{2}<d<\frac{1}{2}\) 时，过程可以保持平稳；当 \(0<d<\frac{1}{2}\) 时，自相关以很慢的速度衰减，表现为长记忆。长记忆过程通常满足 \(\sum_{k=0}^{\infty}|\rho(k)|=\infty\)，而短记忆过程的自相关绝对可和。
### 1.10 因果表示与可逆性
### AR 模型的因果表示
- 如果 AR 多项式的根都在单位圆外，则 \(\phi(L)^{-1}\) 可以展开为收敛的幂级数，因此 \(X_t=\phi(L)^{-1}\theta(L)\varepsilon_t=\sum_{j=0}^{\infty}\psi_j\varepsilon_{t-j}\)。这通常称为因果表示：当前值只依赖当前和过去的冲击，不依赖未来冲击。
- 以 MA(1) 为例，\(X_t=\varepsilon_t+\theta\varepsilon_{t-1}\)。若 \(|\theta|<1\)，则 \(\varepsilon_t=(1+\theta L)^{-1}X_t=X_t-\theta X_{t-1}+\theta^2X_{t-2}-\cdots\)。一般 MA(q) 可逆的充分必要条件是 \(\theta(z)=1+\theta_1z+\cdots+\theta_qz^q=0\) 的所有根都位于单位圆外。
- 对因果 ARMA 模型 \(\phi(L)X_t=\theta(L)\varepsilon_t\)，可以写成 \(X_t=\psi(L)\varepsilon_t\)，其中 \(\psi(L)=\theta(L)/\phi(L)=\sum_{j=0}^{\infty}\psi_jL^j\)。系数 \(\psi_j\) 就是 j 期脉冲响应，表示 t 期一个单位冲击对 \(X_{t+j}\) 的影响。脉冲响应把抽象参数转化为动态影响路径，因此在经济解释和政策分析中通常比单个系数更直观。
### 1.11 最佳线性预测与偏自相关
用最近 k 期信息线性预测当前值：\(\widehat{X}_t=\beta_1X_{t-1}+\cdots+\beta_kX_{t-k}\)。最优系数通过最小化均方预测误差得到： \(\beta^*=\arg\min_{\beta}\mathbb{E}\left[\left(X_t-\sum_{j=1}^{k}\beta_jX_{t-j}\right)^2\right]\)。一阶条件意味着预测误差与所有解释变量正交。记
$$
\Gamma_k=
\begin{pmatrix}
\gamma(0)&\gamma(1)&\cdots&\gamma(k-1)\\
\gamma(1)&\gamma(0)&\cdots&\gamma(k-2)\\
\vdots&\vdots&\ddots&\vdots\\
\gamma(k-1)&\gamma(k-2)&\cdots&\gamma(0)
\end{pmatrix},
\qquad
\gamma_k=
\begin{pmatrix}
\gamma(1)\\
\gamma(2)\\
\vdots\\
\gamma(k)
\end{pmatrix}.
$$
则 \(\beta^*=\Gamma_k^{-1}\gamma_k\)。
k 阶偏自相关系数等于上述回归中最后一个系数，即 \(\rho^*(k)=\beta_k^*\)。它衡量在控制 \(X_{t-1},\ldots,X_{t-k+1}\) 之后，\(X_t\) 与 \(X_{t-k}\) 之间剩余的线性关系。
对 AR(p)，当加入前 p 个滞后后，更远滞后不再提供额外线性解释，因此 \(\rho^*(k)=0\)，其中 \(k>p\)。对可逆 MA(q)，其 AR 表示通常是无限阶的，因此 PACF 一般拖尾。
### 1.12 自协方差生成函数与频域分析
定义自协方差生成函数 AGF：\(g(z)=\sum_{k=-\infty}^{\infty}\gamma(k)z^k\)。对白噪声，\(g(z)=\sigma_\varepsilon^2\)；对MA(q)，\(g(z)=\theta(z)\theta(z^{-1})\sigma_\varepsilon^2\)；对 ARMA(p,q)，\(g(z)=\theta(z)\theta(z^{-1})\sigma_\varepsilon^2/[\phi(z)\phi(z^{-1})]\)。
AGF 把整条自协方差序列压缩成一个函数，适合处理线性滤波和 ARMA 模型。
### 1.13 谱函数
谱函数是自协方差函数的傅里叶变换：
$$
\begin{aligned}
S(\omega)
&=\frac{1}{2\pi}\sum_{k=-\infty}^{\infty}\gamma(k)e^{-ik\omega}\\
&=\frac{1}{2\pi}
\left[
\gamma(0)+2\sum_{k=1}^{\infty}\gamma(k)\cos(k\omega)
\right].
\end{aligned}
$$
逆变换及方差分解为
$$
\gamma(k)=\int_{-\pi}^{\pi}e^{ik\omega}S(\omega)\,d\omega,
\qquad
\gamma(0)=\int_{-\pi}^{\pi}S(\omega)\,d\omega.
$$
时域中的自协方差与频域中的谱函数是一一对应的，两种分析方式在信息上等价。标准化后得到谱密度 \(f(\omega)=S(\omega)/\gamma(0)\)，并满足 \(\int_{-\pi}^{\pi}f(\omega)\,d\omega=1\)。
- 白噪声的谱为常数 \(S(\omega)=\sigma_\varepsilon^2/(2\pi)\)，表示所有频率对方差的贡献相同。
- ARMA(p,q) 的谱为
$$
S(\omega)
=\frac{\sigma_\varepsilon^2}{2\pi}
\frac{\left|\theta(e^{-i\omega})\right|^2}
{\left|\phi(e^{-i\omega})\right|^2}.
$$
- AR(1)，\(S(\omega)=\frac{\sigma_\varepsilon^2}{2\pi}[1+\phi^2-2\phi\cos\omega]^{-1}\)。当参数为正且接近 1 时，低频附近的谱较高，说明序列变化缓慢、持续性强。
- MA(1)，\(S(\omega)=\frac{\sigma_\varepsilon^2}{2\pi}(1+\theta^2+2\theta\cos\omega)\)。
### 1.14 Wold 分解定理
Wold 分解定理指出，任何零均值协方差平稳过程都可以写成\(X_t=X_t^{(d)}+\sum_{j=0}^{\infty}\psi_j\varepsilon_{t-j}\)，其中：
- 确定性部分 \(X_t^{(d)}\) 可以由过去信息完全预测；
- 创新项 \(\varepsilon_t\) 是白噪声；
- 随机部分的系数平方可和，即 \(\sum_{j=0}^{\infty}\psi_j^2<\infty\)。
Wold 分解说明，MA(∞) 不是少数特殊模型，而是平稳随机过程的一般表示。ARMA 模型的价值在于用有限数量的参数近似这个无限阶表示。
### 1.15 估计、定阶与诊断
- AR(p) 可以直接通过最小二乘估计：
$$
\min_{\mu,\phi_1,\ldots,\phi_p}
\sum_{t=p+1}^{T}
\left(
X_t-\mu-\sum_{j=1}^{p}\phi_jX_{t-j}
\right)^2.
$$
如果误差服从正态分布，条件最大似然估计与最小二乘估计一致。
- 增加滞后阶数通常会降低残差平方和，但会提高模型复杂度。常见信息准则为
$$
\begin{aligned}
AIC(p)&=\log\widehat{\sigma}_p^2+\frac{2p}{T},\\
BIC(p)&=\log\widehat{\sigma}_p^2+\frac{p\log T}{T},\\
HQIC(p)&=\log\widehat{\sigma}_p^2+\frac{2p\log\log T}{T}.
\end{aligned}
$$
选择使信息准则最小的阶数。BIC 的复杂度惩罚更强，通常偏向更简洁的模型；AIC 更关注预测表现，可能选择较大的阶数。
- 将 ARMA 写成 \(X_t=z_t^\top\beta+u_t\)，其中 \(u_t=\varepsilon_t+\theta_1\varepsilon_{t-1}+\cdots+\theta_q\varepsilon_{t-q}\)，会出现两个问题：
	1. 复合误差 \(u_t\) 存在序列相关；
	2. 过去的创新 \(\varepsilon_{t-j}\) 不可直接观测。
因此 ARMA 通常采用**非线性最小二乘、条件最大似然或精确最大似然估计**。
### 1.16 Box-Pierce 与 Ljung-Box 检验
要联合检验 \(H_0:\rho(1)=\rho(2)=\cdots=\rho(m)=0\)，可以使用
$$
Q_{BP}=T\sum_{k=1}^{m}\widehat{\rho}(k)^2,
\qquad
Q_{LB}=T(T+2)\sum_{k=1}^{m}
\frac{\widehat{\rho}(k)^2}{T-k}.
$$
在原假设下，它们渐近服从卡方分布。对已估计的 ARMA(p,q) 残差，实践中常以 \(m-p-q\) 作为近似自由度。若拒绝原假设，说明残差仍保留可预测结构，当前模型尚未充分提取时间依赖。
### 模型识别的整体逻辑
对一条实际时间序列，可以按照以下顺序思考：
1. 画出原序列，检查趋势、结构突变、波动聚集和季节性；
2. 判断是否需要取对数、去趋势或差分；
3. 观察 ACF 与 PACF，提出少量候选 ARMA 模型；
4. 用 AIC、BIC 或 HQIC 比较候选模型；
5. 检查参数显著性、平稳性与可逆性；
6. 对残差进行相关图和 Ljung-Box 检验；
7. 在诊断通过后，再解释脉冲响应、进行预测或分析频谱。
---
## Lecture 2 渐近理论
设随机向量序列为 \(\{X_n\}\)，极限为 \(X\)。大样本理论研究样本量增加时，统计量是否收敛、以何种方式收敛，以及围绕极限值的波动速度。
### 2.1 依概率收敛与相合性
- 若对任意 \(\varepsilon>0\) 都有 \(P(\|X_n-X\|>\varepsilon)\to0\)，则称 \(X_n\) 依概率收敛到 \(X\)，记为 \(X_n\xrightarrow{p}X\)。估计量 \(\widehat{\theta}_n\) 若满足 \(\widehat{\theta}_n\xrightarrow{p}\theta_0\)，就称它是参数 \(\theta_0\) 的相合估计量。
- 若均方误差满足 \(\mathbb{E}\|X_n-X\|^2\to0\)，则称为均方收敛。均方收敛蕴含依概率收敛。对常数向量 \(a\)，若 \(X_n\xrightarrow{p}a\)，通常可由均值收敛到 \(a\) 且方差收敛到零来验证。
- 若 \(P(\lim_{n\to\infty}X_n=X)=1\)，则称 \(X_n\) 几乎处处收敛到 \(X\)，记为 \(X_n\xrightarrow{a.s.}X\)。它比依概率收敛更强。
- 若 \(X_n\) 的分布函数在极限分布的连续点上收敛，则称 \(X_n\) 依分布收敛到 \(X\)，记为 \(X_n\xrightarrow{d}X\)。依概率收敛蕴含依分布收敛；当极限是常数时，二者等价。
- 若 \(X_n\xrightarrow{p}X\)，且 \(g\) 连续，则 \(g(X_n)\xrightarrow{p}g(X)\)。
- Slutsky 定理：若 \(X_n\xrightarrow{d}X\)、\(Y_n\xrightarrow{p}c\)，则\(X_n+Y_n\xrightarrow{d}X+c\)、\(X_nY_n\xrightarrow{d}cX\)；当 \(c\neq0\) 时，还有 \(X_n/Y_n\xrightarrow{d}X/c\)。
- 若
$$
\sqrt{n}\left(\widehat{\theta}_n-\theta_0\right)
\xrightarrow{d}\mathcal{N}(0,V),
$$
则称 \(\widehat{\theta}_n\) 渐近正态，\(V\) 是其渐近方差。估计量的实际方差约为 \(V/n\)。
### 2.2 大数定律与中心极限定理
对独立同分布随机变量，若 \(\mathbb{E}|X_i|<\infty\)，强大数定律给出 \(\overline{X}_n\xrightarrow{a.s.}\mu\)。
若进一步 \(\operatorname{Var}(X_i)=\sigma^2<\infty\)，Lindeberg-Levy 中心极限定理给出\(\sqrt{n}(\overline{X}_n-\mu)\xrightarrow{d}\mathcal{N}(0,\sigma^2)\)
对随机向量，若均值为 \(\mu\)、协方差矩阵为 \(\Sigma\)，则\(\sqrt{n}(\overline{X}_n-\mu)\xrightarrow{d}\mathcal{N}(0,\Sigma)\)。
Lyapunov 中心极限定理允许观测相互独立但不同分布。记 \(s_n^2=\sum_{i=1}^n\sigma_i^2\)，若存在 \(\delta>0\) 使
$$
\frac{1}{s_n^{2+\delta}}
\sum_{i=1}^{n}
\mathbb{E}|X_i-\mu_i|^{2+\delta}
\longrightarrow0,
$$
则标准化后的和收敛到标准正态分布。
### 2.3 Delta 方法
若 \(\sqrt{n}(\widehat{\theta}-\theta_0)\xrightarrow{d}\mathcal{N}(0,V)\)，且 \(g\) 在 \(\theta_0\) 处连续可微，导数矩阵为 \(G=\partial g(\theta_0)/\partial\theta^\top\)，则
$$
\sqrt{n}\left[g(\widehat{\theta})-g(\theta_0)\right]
\xrightarrow{d}\mathcal{N}(0,GVG^\top).
$$
Delta 方法本质上是对非线性函数作一阶泰勒展开，是构造非线性参数函数标准误和 Wald 检验的基础。
### 2.3 时间序列的大数定律
独立性在时间序列中通常不成立，因此需要用**平稳性、弱相关或遍历性**替代。
- 设 \(X_t\) 协方差平稳，均值为 \(\mu\)，自协方差为 \(\gamma(k)\)。样本均值的方差为
$$
\operatorname{Var}(\overline{X}_T)
=
\frac{1}{T}
\left[
\gamma(0)
+2\sum_{k=1}^{T-1}
\left(1-\frac{k}{T}\right)\gamma(k)
\right].
$$
若 \(\gamma(k)\to0\)，样本均值在适当条件下依概率收敛到 \(\mu\)。若自协方差绝对可和，则
$$
T\operatorname{Var}(\overline{X}_T)
\longrightarrow
J\equiv\sum_{k=-\infty}^{\infty}\gamma(k).
$$
\(J\) 称为长期方差（long-run variance），也等于零频率处谱密度的 \(2\pi\) 倍。序列相关使样本均值的渐近方差不再只是 \(\gamma(0)\)。
严格平稳过程若相隔足够远的随机变量之间依赖逐渐消失，则可具有遍历性。遍历定理说明，在平稳遍历条件和有限一阶矩下，\(T^{-1}\sum_{t=1}^{T}X_t\xrightarrow{a.s.}\mathbb{E}(X_t)\)。平稳性保证分布不随时间移动，遍历性保证单条足够长的时间序列可以代表总体分布。
### 2.4 时间序列的中心极限定理
对线性过程\(X_t=\mu+\sum_{j=0}^{\infty}\psi_j\varepsilon_{t-j}\)，若创新独立同分布、方差有限且系数绝对可和，则
$$
\sqrt{T}\left(\overline{X}_T-\mu\right)
\xrightarrow{d}
\mathcal{N}(0,J),
\qquad
J=\sigma_\varepsilon^2
\left(\sum_{j=0}^{\infty}\psi_j\right)^2.
$$
有限阶 MA 是 M-dependent 过程的典型例子：当两个观测间隔超过 M 时，它们相互独立。严格平稳、有限方差的 M-dependent 过程满足中心极限定理，其渐近方差仍是长期方差。
对一般平稳遍历过程，仅有大数定律还不够。Gordin 条件通过条件期望的衰减和可和性控制长期依赖，使部分和可以近似为鞅差序列，从而得到 \(T^{-1/2}\sum_{t=1}^{T}(X_t-\mu)\xrightarrow{d}\mathcal{N}(0,J)\)。
### 2.5 长期方差与 HAC 估计
直接对所有样本自协方差求和并不相合，因为高阶自协方差数量多、估计噪声大。核估计通过对高阶滞后降权解决这一问题：
$$
\widehat{J}
=
\widehat{\gamma}(0)
+
2\sum_{k=1}^{T-1}
K\left(\frac{k}{h}\right)\widehat{\gamma}(k),
$$
其中 \(K(\cdot)\) 是核函数，\(h\) 是带宽或截断阶数。
#### 常用核函数
- 截断核：带宽内权重为 1，带宽外为 0，边界不连续；
- Bartlett 核：\(K(x)=1-|x|\)（\(|x|\leq1\)），对应 Newey-West HAC 估计；
- Parzen 核：分段三次多项式，边界更平滑；
- Tukey-Hanning 核：\(K(x)=[1+\cos(\pi x)]/2\)（\(|x|\leq1\)）；
- Quadratic Spectral 核：不进行硬截断，在均方误差意义下具有良好性质。
相合性通常要求 \(h\to\infty\) 且 \(h/T\to0\)。带宽过小会遗漏长期相关，带宽过大则引入高阶样本自协方差的噪声。

---
## Lecture 3 GMM 估计
### 3.1 矩条件与识别
广义矩估计（Generalized Method of Moments, GMM）用总体矩条件识别未知参数。设观测为 \(z_i\)，参数 \(\theta_0\in\mathbb{R}^p\)，矩函数 \(m(z_i,\theta)\in\mathbb{R}^r\)，真实参数满足 \(\mathbb{E}[m(z_i,\theta_0)]=0\)。 识别要求该方程在参数空间中只有唯一解。通常需要 \(r\geq p\)：
- \(r=p\)：恰好识别；
- \(r>p\)：过度识别，额外矩条件可用于提高效率和检验模型。
样本矩为 \(\overline{m}_n(\theta)=n^{-1}\sum_{i=1}^{n}m(z_i,\theta)\)。恰好识别时可以直接求解 \(\overline{m}_n(\widehat{\theta})=0\)；过度识别时一般无法让全部样本矩同时等于零，需要最小化加权距离。
### 3.2 GMM 估计量
给定对称正定权重矩阵 \(W_n\)，GMM 估计量定义为
$$
\widehat{\theta}
=
\arg\min_{\theta\in\Theta}
Q_n(\theta),
\qquad
Q_n(\theta)
=
\overline{m}_n(\theta)^\top
W_n
\overline{m}_n(\theta).
$$
权重矩阵决定不同矩条件的相对权重。恰好识别时，只要权重矩阵非奇异，GMM 解与权重选择无关；过度识别时，权重会影响渐近效率。
- 总体均值估计使用矩条件 \(\mathbb{E}(X_i-\mu)=0\)，样本解就是 \(\widehat{\mu}=\overline{X}\)。
- 在线性工具变量模型 \(y_i=x_i^\top\beta+u_i\) 中，若工具变量 \(w_i\) 满足 \(\mathbb{E}(w_iu_i)=0\)，矩函数为 \(m_i(\beta)=w_i(y_i-x_i^\top\beta)\)。工具变量个数不少于内生解释变量个数是识别的必要条件之一。
- 最大似然估计的得分满足 \(\mathbb{E}[\partial\log f(z_i,\theta_0)/\partial\theta]=0\)，因此 MLE 可以看作使用得分矩条件的恰好识别 GMM。
- 非线性最小二乘的目标为 \(\sum_i[y_i-g(x_i,\theta)]^2\)，一阶条件对应矩函数 \(m_i(\theta)=[y_i-g(x_i,\theta)]\partial g(x_i,\theta)/\partial\theta\)，所以 NLLS 也是 GMM 的特例。
### 3.3 消费资本资产定价模型（CCAPM）
在消费资本资产定价模型中，代表性投资者的 Euler 方程给出
$$
\mathbb{E}_t
\left[
\beta
\left(\frac{c_{t+1}}{c_t}\right)^{-\gamma}
R_{t+1}
-\mathbf{1}
\right]=0.
$$
其中 \(\beta\) 是时间折现因子，\(\gamma\) 是相对风险厌恶系数。对信息集内的工具变量 \(Z_t\)，无条件矩条件为
$$
\mathbb{E}
\left\{
Z_t\otimes
\left[
\beta
\left(\frac{c_{t+1}}{c_t}\right)^{-\gamma}
R_{t+1}
-\mathbf{1}
\right]
\right\}
=0.
$$
GMM 特别适合非线性理性预期模型：无需完整指定数据的联合分布，只需利用理论给出的正交条件。
### 3.4 相合性与渐近正态性
记总体矩为 \(\mu(\theta)=\mathbb{E}[m(z_i,\theta)]\)。GMM 相合性的核心条件是：参数空间紧致或估计量受控；样本矩一致收敛到总体矩；权重矩阵收敛到正定矩阵；\(\mu(\theta)=0\) 唯一识别 \(\theta_0\)。
令 \(G=\mathbb{E}[\partial m(z_i,\theta_0)/\partial\theta^\top]\)，并记矩条件的渐近协方差为
$$
\Omega
=
\lim_{n\to\infty}
\operatorname{Var}
\left[
\frac{1}{\sqrt{n}}
\sum_{i=1}^{n}
m(z_i,\theta_0)
\right].
$$
若 \(W_n\xrightarrow{p}W\)，则
$$
\sqrt{n}(\widehat{\theta}-\theta_0)
\xrightarrow{d}
\mathcal{N}(0,V_W),
$$
其中
$$
V_W
=
(G^\top WG)^{-1}
G^\top W\Omega WG
(G^\top WG)^{-1}.
$$
（最优GMM）在正半定意义下，最优权重矩阵是 \(W=\Omega^{-1}\)。此时渐近方差化简为
$$
V_{\mathrm{eff}}
=
(G^\top\Omega^{-1}G)^{-1}.
$$
最优 GMM 赋予噪声较小、信息较多的矩条件更高权重，并自动考虑不同矩条件之间的相关性。
若矩条件存在序列相关，则
$$
\Omega
=
\sum_{j=-\infty}^{\infty}\Gamma(j),
\qquad
\Gamma(j)
=
\mathbb{E}[m_t(\theta_0)m_{t-j}(\theta_0)^\top].
$$
此时应使用 HAC 或 Newey-West 方法估计长期协方差，而不能只用同期矩 \(n^{-1}\sum_tm_tm_t^\top\)。
### 3.5 高效估计——两步GMM法
第一步选取方便的正定矩阵，例如单位矩阵，得到初始相合估计：
$$
\widehat{\theta}^{(1)}
=
\arg\min_\theta
\overline{m}(\theta)^\top
W^{(1)}
\overline{m}(\theta).
$$
用初始残差估计 \(\widehat{\Omega}(\widehat{\theta}^{(1)})\)，第二步令 \(W^{(2)}=\widehat{\Omega}^{-1}\)，再求
$$
\widehat{\theta}^{(2)}
=
\arg\min_\theta
\overline{m}(\theta)^\top
\widehat{\Omega}^{-1}
\overline{m}(\theta).
$$
两步估计已达到一阶渐近效率。
迭代 GMM 在每轮估计后重新计算权重矩阵，直到参数收敛。连续更新估计（CUE）则让权重矩阵随候选参数同时变化：\(\widehat{\theta}_{CUE}=\arg\min_\theta\overline{m}(\theta)^\top\widehat{\Omega}(\theta)^{-1}\overline{m}(\theta)\)。它们与两步 GMM 一阶渐近等价，但有限样本表现和数值稳定性可能不同。
### 3.6 GMM实施与诊断
实际应用中应依次检查：
1. 矩条件是否来自清晰的理论限制；
2. 参数是否被唯一识别，Jacobian \(G\) 是否满列秩；
3. 权重矩阵是否正定且数值稳定；
4. 时间序列矩条件是否需要 HAC 协方差；
5. 过度识别限制是否与数据相容；
6. 结果是否对工具变量、带宽和初始值敏感。

---
## Lecture 4 GMM 检验
### 4.1 GMM 假设检验框架
设参数 \(\theta\in\mathbb{R}^p\)，要检验 k 个非线性限制 \(H_0:h(\theta_0)=0\)，其中 \(h:\mathbb{R}^p\to\mathbb{R}^k\)，Jacobian
\(H(\theta)=\partial h(\theta)/\partial\theta^\top\) 在原假设下满行秩。GMM 中的 Wald、似然比型和 LM 检验与极值估计中的三大检验相对应。在常规条件和正确设定下，它们渐近等价，并收敛到 \(\chi_k^2\)。
参数限制检验 VS 矩条件检验
### 4.2 极值估计中的三大检验
设无约束估计量为 \(\widehat{\theta}\)，受限估计量为 \(\widetilde{\theta}=\arg\min_{\theta:h(\theta)=0}Q_n(\theta)\)。
- **Wald 检验**
若 \(\sqrt{n}(\widehat{\theta}-\theta_0)\xrightarrow{d}\mathcal{N}(0,V)\)，Wald 统计量为
$$
W
=
n\,h(\widehat{\theta})^\top
\left[
H(\widehat{\theta})
\widehat{V}
H(\widehat{\theta})^\top
\right]^{-1}
h(\widehat{\theta}).
$$
Wald 检验只需要无约束估计量，衡量无约束估计对限制的偏离。
- **似然比型检验**
极值估计中的 LR 型统计量比较受限与无约束目标函数：
$$
LR
=
n\left[
Q_n(\widetilde{\theta})
-
Q_n(\widehat{\theta})
\right],
$$
并根据目标函数的标准化采用相应尺度修正。对最优 GMM，目标函数差具有直接的卡方极限。该检验需要同时求解受限和无约束问题，但通常比 Wald 检验更尊重参数约束的几何结构。
- **LM 或 Score 检验**
LM 检验只估计受限模型，考察受限点处目标函数梯度是否仍显著偏离零。若受限模型正确，梯度在可行方向上的分量应接近零；若限制错误，拉格朗日乘子会系统性偏离零。在无约束模型难以估计时尤其有用。
### 4.3 Hansen 过度识别检验
当矩条件数 \(r\) 大于参数数 \(p\) 时，模型提供 \(r-p\) 个可检验的过度识别限制。使用高效 GMM 估计量，Hansen J 统计量为
$$
J
=
n\,
\overline{m}(\widehat{\theta})^\top
\widehat{\Omega}^{-1}
\overline{m}(\widehat{\theta}).
$$
在原假设“全部矩条件均正确”下，\(J\xrightarrow{d}\chi_{r-p}^2\)。拒绝原假设表示至少一个矩条件与数据不相容，但不能直接指出是哪一个条件错误。J 检验同时依赖结构模型、工具变量外生性和协方差估计，因此“不拒绝”也不代表模型一定正确。
- 差分Hansen检验：比较加入某组矩条件前后的 J 统计量，检验这组新增矩条件是否有效。
### 4.3 检验的实施原则
- 先明确原假设对应参数限制还是矩条件有效性；
- 参数限制可在 Wald、LR 型和 LM 中选择；
- 工具变量或模型整体有效性使用 Hansen J 或差分 J；
- 时间序列矩条件必须使用 HAC 协方差；
- 弱识别、协方差矩阵病态和大量工具变量会扭曲卡方近似；
- 拒绝综合设定检验后，应通过分组矩条件和经济逻辑定位问题。

---
## Lecture 5 单位根与非平稳性
### 5.1 单位根与非平稳性
对 AR(1) 模型 \(X_t=\phi X_{t-1}+\varepsilon_t\)，当 \(|\phi|<1\) 时过程平稳；当 \(\phi=1\) 时，\(X_t=X_{t-1}+\varepsilon_t\)，过程成为随机游走并含有单位根。反复代入得到 \(X_t=X_0+\sum_{j=1}^{t}\varepsilon_j\)。任意一次冲击都会永久进入未来水平，而且 \(\operatorname{Var}(X_t)=\operatorname{Var}(X_0)+t\sigma_\varepsilon^2\) 随时间增长。
若序列经过一次差分变为平稳，即 \(\Delta X_t=X_t-X_{t-1}\sim I(0)\)，则称 \(X_t\) 为一阶单整过程，记为 \(X_t\sim I(1)\)。一般地，差分 d 次后平稳的过程记为 \(I(d)\)。
### 5.2 趋势平稳与差分平稳
**趋势平稳过程**可写成 \(Y_t=\alpha+\delta t+u_t\)，其中 \(u_t\) 平稳。去除确定性趋势后，偏离趋势的冲击会逐渐消失，长期预测会回到确定性趋势线。
差分平稳过程：带漂移随机游走可写成 \(Y_t=\delta+Y_{t-1}+\varepsilon_t\)。一阶差分为 \(\Delta Y_t=\delta+\varepsilon_t\)，因此差分后平稳，但水平中的冲击具有永久影响。
### 5.3 Brownian Motion 与函数型中心极限定理
单位根统计量包含随机游走的部分和，普通中心极限定理不足以描述其极限。定义标准 Brownian motion \(W(r)\)，其中 \(0\leq r\leq1\)，满足：\(W(0)=0\)；增量独立；\(W(r)-W(s)\sim\mathcal{N}(0,r-s)\)；样本路径连续。对均值为零、方差为一的独立同分布序列，
$$
\frac{1}{\sqrt{T}}
\sum_{t=1}^{\lfloor Tr\rfloor}
\varepsilon_t
\Rightarrow W(r),
\qquad 0\leq r\leq1.
$$
符号 \(\Rightarrow\) 表示随机函数的弱收敛。若误差存在弱序列相关，则尺度由长期方差决定：
\(T^{-1/2}\sum_{t=1}^{\lfloor Tr\rfloor}u_t\Rightarrow\lambda W(r)\)。
许多单位根统计量的极限是 Brownian motion 的积分比值，而不是正态或普通卡方分布。
### 5.4 Dickey-Fuller 检验
单位根检验的原假设通常为 \(H_0:\rho=1\)，备择为 \(H_1:|\rho|<1\)。将 \(Y_t=\rho Y_{t-1}+\varepsilon_t\) 改写为 \(\Delta Y_t=\gamma Y_{t-1}+\varepsilon_t\)，其中 \(\gamma=\rho-1\)，于是检验 \(H_0:\gamma=0\)。
**1. 无常数项**
回归式为 \(\Delta Y_t=\gamma Y_{t-1}+\varepsilon_t\)。DF rho 统计量为 \(T(\widehat{\rho}-1)\)，DF t 统计量是 \(\widehat{\gamma}/se(\widehat{\gamma})\)。
在单位根原假设下，
$$
T(\widehat{\rho}-1)
\Rightarrow
\frac{\frac{1}{2}[W(1)^2-1]}
{\int_0^1W(r)^2\,dr},
$$
而 t 统计量也收敛到 Brownian motion 泛函。二者都不能使用普通正态临界值。
**2. 含常数项**
若备择模型允许非零均值，回归式为 \(\Delta Y_t=\alpha+\gamma Y_{t-1}+\varepsilon_t\)。加入常数相当于在极限中对 Brownian motion 去均值，因此临界值与无常数项情形不同。
**3. 含常数和趋势项**
若备择模型允许确定性线性趋势，回归式为\(\Delta Y_t=\alpha+\delta t+\gamma Y_{t-1}+\varepsilon_t\)。极限过程需要同时去除常数和线性趋势，临界值进一步变化。
**确定项必须依据数据生成过程选择。遗漏必要趋势会降低检验有效性；加入不必要趋势会损失检验功效。**
### 5.5 Augmented Dickey-Fuller 检验
普通 DF 检验要求回归误差为白噪声。若 \(\Delta Y_t\) 存在序列相关，可加入滞后差分：
$$
\Delta Y_t
=
\alpha+\delta t+\gamma Y_{t-1}
+\sum_{j=1}^{p}\varphi_j\Delta Y_{t-j}
+\varepsilon_t.
$$
检验仍针对 \(H_0:\gamma=0\)。滞后差分吸收短期动态，使残差近似白噪声。在适当条件下，ADF t 统计量具有与相应确定项设定下 DF 检验相同的非标准极限分布。滞后阶数过小会留下残差相关，过大则降低功效。可结合 AIC、BIC、残差相关检验或从较大阶数逐步删减。
**Phillips-Perron（PP）检验**保留简单 DF 回归，但对统计量进行非参数修正，以允许误差存在异方差和序列相关。记短期方差为 \(\gamma_0=\operatorname{Var}(u_t)\)，长期方差为 \(\lambda^2=\sum_{k=-\infty}^{\infty}\operatorname{Cov}(u_t,u_{t-k})\)。PP 检验使用核方法估计 \(\lambda^2\)，修正 DF rho 或 t 统计量，使其在原假设下具有相应 DF 极限。ADF 通过参数化增加滞后项处理相关性，PP 通过 HAC 长期方差进行非参数修正。两者有限样本表现可能对滞后阶数或带宽敏感。
对资产价格对数水平进行 ADF 检验，往往不能拒绝单位根；对其一阶差分，即对数收益率，通常可以拒绝单位根。这意味着价格水平可近似为 I(1)，而收益率为 I(0)。
“不拒绝单位根”并不是证明存在单位根。单位根检验在有限样本下功效较低，特别是当真实根接近 1、存在结构突变或非线性调整时。应结合图形、经济机制、其他检验和结构稳定性分析。
---
## Lecture 6 向量自回归（VAR）
### 6.1 VAR 模型
向量自回归（Vector Autoregression, VAR）把多个时间序列共同建模。令
\(Y_t=(Y_{1t},\ldots,Y_{Kt})^\top\)，VAR(p) 为
$$
Y_t
=
c+A_1Y_{t-1}+\cdots+A_pY_{t-p}+u_t,
\qquad
\mathbb{E}(u_tu_t^\top)=\Sigma_u.
$$
每个方程都使用所有变量的滞后项，因此 VAR 不需要预先区分哪些变量是“内生”或“外生”。它适合描述多变量的预测关系和动态相互作用。
- VAR(p) 的特征多项式为 \(A(z)=I_K-A_1z-\cdots-A_pz^p\)。过程平稳的充分必要条件是 \(\det A(z)=0\) 的所有根都位于单位圆外。
### 6.2 VAR的伴随矩阵表示与MA(∞) 表示
定义状态向量 \(Z_t=(Y_t^\top,Y_{t-1}^\top,\ldots,Y_{t-p+1}^\top)^\top\)，则 VAR(p) 可写成 VAR(1)：
$$
Z_t
=
C+
\mathcal{A}Z_{t-1}
+\eta_t,
\qquad
\mathcal{A}=
\begin{pmatrix}
A_1&A_2&\cdots&A_p\\
I&0&\cdots&0\\
0&I&\cdots&0\\
\vdots&&\ddots&\vdots
\end{pmatrix}.
$$
平稳性等价于伴随矩阵 \(\mathcal{A}\) 的全部特征值位于单位圆内。该表示便于推导预测、脉冲响应和长期矩。
平稳 VAR 可以反演为
$$
Y_t
=
\mu+\sum_{j=0}^{\infty}\Psi_ju_{t-j},
\qquad
\Psi_0=I_K,
$$
其中
$$
\Psi_j
=
A_1\Psi_{j-1}+\cdots+A_p\Psi_{j-p},
$$
并约定 \(\Psi_j=0\)（\(j<0\)）。矩阵 \(\Psi_j\) 的第 \((a,b)\) 个元素表示第 b 个约化式冲击对 j 期后第 a 个变量的影响。
### 脉冲响应函数（IRF）
约化式创新 \(u_t\) 的不同分量通常同期相关，因此“只改变一个创新、其他创新保持不变”不一定具有结构解释。需要先把创新正交化： \(u_t=P\varepsilon_t\)，其中 \(\mathbb{E}(\varepsilon_t\varepsilon_t^\top)=I\) 且 \(PP^\top=\Sigma_u\)。
于是
$$
Y_t
=
\mu+
\sum_{j=0}^{\infty}
\Psi_jP\varepsilon_{t-j}.
$$
正交化脉冲响应矩阵为 \(\Theta_j=\Psi_jP\)。\(\Theta_j(a,b)\) 表示第 b 个结构冲击上升一个标准差后，第 a 个变量在 j 期后的响应。
常见选择是令 P 为 \(\Sigma_u\) 的 Cholesky 下三角因子。这对应递归同期结构，但结果依赖变量排序：
- 排在前面的变量可以同期影响后面的变量；
- 排在后面的变量不能同期影响前面的变量。
因此排序必须由经济理论而不是统计便利决定。不同的 P 都可满足 \(PP^\top=\Sigma_u\)，正交化并不唯一。
### 预测误差方差分解
h 期预测误差为
$$
Y_{t+h}-\widehat{Y}_{t+h|t}
=
\sum_{j=0}^{h-1}
\Theta_j\varepsilon_{t+h-j}.
$$
第 a 个变量的 h 期预测误差方差为
$$
\operatorname{Var}_a(h)
=
\sum_{j=0}^{h-1}
\sum_{b=1}^{K}
\Theta_j(a,b)^2.
$$
冲击 b 对该方差的贡献比例为
$$
FEVD_{a\leftarrow b}(h)
=
\frac{
\sum_{j=0}^{h-1}\Theta_j(a,b)^2
}{
\sum_{j=0}^{h-1}\sum_{\ell=1}^{K}\Theta_j(a,\ell)^2
}.
$$
脉冲响应描述冲击的动态路径，方差分解描述不同冲击对预测不确定性的相对贡献。二者都依赖结构识别。
### Granger 因果关系
如果在控制 \(Y_t\) 自身过去以及系统中其他信息后，\(X_t\) 的过去仍能改善对 \(Y_t\) 的预测，则称 X Granger 导致 Y。在 VAR 中，检验“X 不 Granger 导致 Y”等价于检验 Y 方程中所有 X 的滞后系数联合为零。可使用 F、Wald、LR 或 LM 检验。Granger 因果是预测先后关系，不等同于结构因果。遗漏变量、共同冲击、数据频率和信息集都会影响结论。两变量之间可能单向因果、双向因果，也可能相互都不 Granger 导致。

---
## Lecture 7 协整
### 定义、长期均衡与伪回归
- **协整**：若向量各分量均为 I(1)，但存在非零向量 β 使其线性组合为 I(0)，则这些变量协整：
$$
Y_t\sim CI(1,1),
\qquad
\beta^\top Y_t\sim I(0).
$$
- **长期均衡**：β 给出变量之间稳定的长期关系；单个序列可以漂移，但均衡误差 βᵀYₜ 必须平稳。
- **伪回归**：互不相关的 I(1) 序列直接做水平回归，也可能出现很高的 R² 和显著 t 值；普通平稳回归推断此时无效。
### VECM 与协整秩
水平 VAR(p) 可改写为向量误差修正模型：
$$
\Delta Y_t
=
\Pi Y_{t-1}
+
\sum_{j=1}^{p-1}\Gamma_j\Delta Y_{t-j}
+
u_t,
\qquad
\Pi=\alpha\beta^\top.
$$
- **β：长期关系**。β 的每一列是一条协整向量，βᵀYₜ₋₁ 是上一期均衡误差。
- **α：调整速度**。αᵢⱼ 表示第 i 个变量对第 j 条长期失衡的修正方向与速度。
- **rank(Π)=K**：Yₜ 在水平上平稳，不需要协整框架。
- **rank(Π)=0**：不存在协整关系，使用差分 VAR。
- **0<rank(Π)=r<K**：存在 r 条协整关系，使用 VECM；系统有 K−r 个共同随机趋势。
### Engle–Granger 两步法
1. 用水平变量估计长期回归，得到残差 ûₜ。
2. 对 ûₜ 做残差 ADF 检验；拒绝“残差有单位根”意味着存在协整。
该方法适合单一协整关系；临界值不是普通 DF 临界值，且结果可能受归一化变量选择影响。
### Johansen 检验
Johansen 在 VECM 系统中通过特征值估计协整秩，可同时处理多条协整关系。设特征值按 λ̂₁≥⋯≥λ̂K 排列：
$$
LR_{\mathrm{trace}}(r)
=
-T\sum_{i=r+1}^{K}\log(1-\widehat{\lambda}_i),
$$
$$
LR_{\max}(r,r+1)
=
-T\log(1-\widehat{\lambda}_{r+1}).
$$
- **Trace**：检验 H₀: rank(Π)≤r，对所有剩余特征值的证据求和。
- **Max-Eigen**：检验 H₀: rank(Π)=r 对 H₁: rank(Π)=r+1，只看下一个特征值。
- 两者均从 r=0 开始顺序检验，临界值取决于确定项设定，而非普通卡方分布。
> 来源：Lecture 7 Cointegration.pdf（Xu Zheng）。
---
## Lecture 8 因子模型
### 共同成分与特有成分
静态因子模型把高维变量分为少数共同因子和个体噪声：
$$
X_{it}
=
\lambda_i^\top F_t+e_{it}
=
C_{it}+e_{it}.
$$
其中 Cᵢₜ=λᵢᵀFₜ 是共同成分，解释变量之间的共同波动；eᵢₜ 是特有成分，只反映个体噪声或局部动态。
### PCA：最大化解释方差
第一主成分是在单位长度约束下方差最大的线性组合：
$$
c_1
=
\arg\max_{c^\top c=1}
c^\top\Sigma_Xc,
\qquad
\Sigma_Xc_j=\lambda_jc_j.
$$
- **特征向量 cⱼ**：第 j 个主成分的方向或权重。
- **特征值 λⱼ**：该方向解释的方差；解释比例为 λⱼ/Σᵢλᵢ。
- 后续主成分在与已有方向正交的条件下继续最大化解释方差。
- **标准化**：量纲或波动尺度差异明显时，先对每个变量去均值并除以标准差，相当于对相关系数矩阵做 PCA；否则高方差变量会主导结果。
### 旋转不可识别
对任意非奇异矩阵 H：
$$
F\Lambda^\top
=
(FH)(\Lambda H^{-\top})^\top.
$$
因此 F 和 Λ 不能分别唯一识别；可识别的是因子空间与共同成分 FΛᵀ。因子符号、顺序和旋转本身不应被赋予经济含义。
### 静态因子与动态因子
- **静态因子模型**：Xₜ 只依赖当期因子 Fₜ。
- **动态因子模型**：Xₜ 还依赖动态因子的滞后，因子自身也具有时间序列动态。
- 静态因子数衡量当期共同成分的维度；动态冲击数衡量驱动整个系统的基本冲击数量。
> 来源：Lecture 8 Factor Models.pdf（Xu Zheng）。
---
## Lecture 9 动态因子模型
### 动态因子的静态堆叠
若观测方程包含动态因子 fₜ 的 0 至 s 阶滞后，可定义：
$$
F_t
=
(f_t^\top,f_{t-1}^\top,\ldots,f_{t-s}^\top)^\top,
\qquad
X_t=\Lambda F_t+e_t.
$$
动态模型因此可写成静态因子形式；若动态因子维数为 q，堆叠后的静态因子数最多为 q(s+1)。
### 状态空间模型
线性高斯状态空间模型由状态方程和观测方程组成：
$$
s_t=As_{t-1}+B\eta_t,
\qquad
X_t=Cs_t+\nu_t,
$$
其中 sₜ 是不可观测状态，Xₜ 是含测量误差的观测。动态因子及其滞后可放入 sₜ。
### Kalman filter：prediction–update
**Prediction**
$$
s_{t|t-1}=As_{t-1|t-1},
\qquad
P_{t|t-1}=AP_{t-1|t-1}A^\top+BQB^\top.
$$
创新及其方差为：
$$
v_t=X_t-Cs_{t|t-1},
\qquad
S_t=CP_{t|t-1}C^\top+R.
$$
**Update**
$$
K_t=P_{t|t-1}C^\top S_t^{-1},
$$
$$
s_{t|t}=s_{t|t-1}+K_tv_t,
\qquad
P_{t|t}=(I-K_tC)P_{t|t-1}.
$$
Kalman gain Kₜ 在模型预测与新观测之间分配权重：观测噪声越大，越依赖预测；状态不确定性越大，越依赖新数据。
### Filter 与 smoother
- **Filter：sₜ\|ₜ** 只使用截至 t 的信息，适合实时估计和预测。
- **Smoother：sₜ\|T** 使用完整样本及未来信息，适合历史状态估计和参数分析。
- 实时应用不能使用 smoother，否则会产生前视偏差。
> 来源：Lecture 9 Dynamic Factor Models.pdf（Xu Zheng）。
---
## Lecture 10 ARCH 与 GARCH
### 波动聚集、条件方差与 ARCH
金融收益常出现大波动成簇、小波动成簇，即 **volatility clustering**。令均值方程创新为 uₜ：
$$
u_t=\sqrt{h_t}\varepsilon_t,
\qquad
h_t=\operatorname{Var}(u_t\mid\mathcal F_{t-1}).
$$
ARCH(q) 直接用过去平方冲击刻画条件方差：
$$
h_t
=
\omega+\sum_{i=1}^{q}\alpha_i u_{t-i}^2,
\qquad
\omega>0,\ \alpha_i\ge0.
$$
条件方差随时间变化会形成正态方差混合，因此即使 εₜ 条件正态，uₜ 的无条件分布也可表现出厚尾。
### GARCH(1,1)、持续性与长期方差
$$
h_t
=
\omega+\alpha u_{t-1}^2+\beta h_{t-1}.
$$
- **α（news effect）**：条件方差对最新平方冲击的反应强度。
- **β（persistence）**：过去条件方差延续到本期的程度。
- **α+β**：总体波动持续性；越接近 1，冲击消退越慢。
- **二阶平稳条件**：α+β<1。
- **长期方差**：
$$
\bar h=\frac{\omega}{1-\alpha-\beta}.
$$
- **半衰期**：
$$
HL=\frac{\log(1/2)}{\log(\alpha+\beta)}.
$$
- **IGARCH**：α+β=1，波动冲击不按通常方式均值回复，有限的长期方差公式失效。
### 波动预测
一步预测为：
$$
h_{t+1|t}
=
\omega+\alpha u_t^2+\beta h_t.
$$
当 α+β<1 时，多步预测向长期方差回复：
$$
h_{t+s|t}
=
\bar h
+
(\alpha+\beta)^{s-1}
(h_{t+1|t}-\bar h).
$$
### ARCH-LM 与平方收益的 ARMA 结构
- **ARCH-LM**：先估计均值方程，再将 ûₜ² 对常数和 p 阶滞后平方残差回归；在“无 ARCH 效应”下，TR² 渐近服从 χ²(p)。
- 令 vₜ=uₜ²−hₜ，GARCH(1,1) 可写为：
$$
u_t^2
=
\omega+(\alpha+\beta)u_{t-1}^2
+v_t-\beta v_{t-1}.
$$
因此平方收益具有 ARMA(1,1) 型结构，其自相关持续性由 α+β 控制。
### QMLE 与厚尾
Gaussian QMLE 最大化：
$$
\ell_t
=
-\frac12
\left(
\log h_t+\frac{u_t^2}{h_t}
\right)
+\mathrm{constant}.
$$
即使 εₜ 不服从正态，只要条件均值和条件方差设定正确，QMLE 在适当矩条件下仍可相合；推断应使用稳健标准误。厚尾既可能来自时变条件方差的混合，也可能来自 εₜ 本身的厚尾分布。
### EGARCH、TGARCH 与 leverage effect
**Leverage effect** 指负收益通常比同幅度正收益引起更大的未来波动。
EGARCH 对数方差模型：
$$
\log h_t
=
\omega+\beta\log h_{t-1}
+\alpha(|\varepsilon_{t-1}|-\mathbb E|\varepsilon|)
+\gamma\varepsilon_{t-1}.
$$
对数形式自动保证 hₜ>0；γ 捕捉冲击符号带来的不对称影响。
TGARCH：
$$
h_t
=
\omega+\alpha u_{t-1}^2
+\gamma u_{t-1}^2 I(u_{t-1}<0)
+\beta h_{t-1}.
$$
正冲击影响为 α，负冲击影响为 α+γ；γ>0 表示负面冲击放大波动。
### DCC
动态条件相关模型将协方差分解为：
$$
H_t=D_tR_tD_t,
$$
先用单变量 GARCH 估计 Dₜ，再用标准化残差 zₜ 更新相关性：
$$
Q_t
=
(1-a-b)\bar Q
+
a z_{t-1}z_{t-1}^\top
+
bQ_{t-1},
$$
最后把 Qₜ 标准化为相关矩阵 Rₜ。DCC 用较少参数描述随时间变化的多资产相关性。
> 来源：Lecture 10 GARCH.pdf（Xu Zheng）。
