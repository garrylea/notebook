import React, { useState } from 'react';
import { Form, Input, Button, Typography, Divider } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../../api/auth';
import { useAppStore } from '../../store';

const { Title, Text } = Typography;

const Login: React.FC = () => {
    const navigate = useNavigate();
    const setUser = useAppStore(s => s.setUser);
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: { email: string; password: string }) => {
        setLoading(true);
        try {
            const data: any = await login(values);
            localStorage.setItem('accessToken', data.accessToken);
            setUser(data.user);
            navigate('/');
        } catch {
            // error handled by axios interceptors (antd message)
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3d 50%, #1a1a2e 100%)',
        }}>
            <div style={{
                width: 420,
                padding: '48px 44px',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
            }}>
                {/* Logo Area */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        width: 56, height: 56,
                        borderRadius: 16,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                        fontSize: 28,
                        boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
                    }}>📝</div>
                    <Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>
                        Smart Notepad
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                        Sign in to your workspace
                    </Text>
                </div>

                <Form layout="vertical" onFinish={onFinish} size="large">
                    <Form.Item
                        name="email"
                        rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}
                    >
                        <Input
                            placeholder="Email Address"
                            style={{
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: 10,
                                color: '#fff',
                                height: 48,
                            }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Please enter the password' }]}
                    >
                        <Input.Password
                            placeholder="Password"
                            style={{
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: 10,
                                color: '#fff',
                                height: 48,
                            }}
                        />
                    </Form.Item>

                    <Form.Item style={{ marginTop: 8 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            style={{
                                height: 48,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                border: 'none',
                                fontWeight: 600,
                                fontSize: 15,
                                boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                            }}
                        >
                            Login
                        </Button>
                    </Form.Item>
                </Form>

                <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>or</Text>
                </Divider>

                <div style={{ textAlign: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Don't have an account?{' '}
                        <Link to="/register" style={{ color: '#818cf8', fontWeight: 600 }}>
                            Sign up
                        </Link>
                    </Text>
                </div>
            </div>
        </div>
    );
};

export default Login;
